import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, map, of } from 'rxjs';
import { ClerkService } from 'ngx-clerk';
import { ChatMessage, AIModelOption, SupportedAIModel } from '../models/chat.model';
import { Session } from '../models/session.model';

export const AI_MODELS: AIModelOption[] = [
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', provider: 'Groq' },
];

interface RuntimeHealthResponse {
  ok: boolean;
  model?: string;
  error?: string;
}

interface RuntimeChatPayload {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  sessionId?: string;
}

interface SessionMessagesResponse {
  messages: ChatMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private clerk = inject(ClerkService, { optional: true });

  readonly selectedModel = signal<SupportedAIModel>('openai/gpt-oss-20b');
  readonly messages = signal<ChatMessage[]>([]);
  readonly isStreaming = signal<boolean>(false);

  private abortController: AbortController | null = null;

  setModel(model: SupportedAIModel): void {
    this.selectedModel.set(model);
  }

  initSessionChat(session: Session): void {
    const reflectionText = session.reflection?.text || 'Focus session completed.';
    const scratchpad = session.scratchpadNotes || '';

    const initialAssistantMsg: ChatMessage = {
      id: 'msg_init_' + Date.now(),
      role: 'assistant',
      content: `I have synthesized your reflection and notes on **${session.topic}**.\n\nYou noted:\n> "${reflectionText.slice(0, 160)}${reflectionText.length > 160 ? '...' : ''}"\n\n${scratchpad ? `I also see your focus scratchpad questions. Where would you like to drill in first?` : `How can I help you test or expand this mental model?`}`,
      timestamp: Date.now(),
      model: this.selectedModel()
    };

    this.messages.set([initialAssistantMsg]);
  }

  async loadSessionChat(session: Session): Promise<void> {
    try {
      const res = await fetch(`/api/sessions/${session.id}/messages`, {
        headers: await this.authHeaders()
      });
      if (res.ok) {
        const body = (await res.json()) as SessionMessagesResponse;
        if (Array.isArray(body.messages) && body.messages.length > 0) {
          this.messages.set(body.messages);
          return;
        }
      }
    } catch {
      // Fall through to the local greeting if history is unavailable.
    }

    this.initSessionChat(session);
  }

  sendMessage(userPrompt: string, sessionContext?: Session | null): Observable<string> {
    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      content: userPrompt,
      timestamp: Date.now()
    };

    this.messages.update(prev => [...prev, userMsg]);
    this.isStreaming.set(true);

    const stream$ = new Subject<string>();
    const assistantMsgId = 'msg_a_' + Date.now();

    const placeholderAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: this.selectedModel()
    };

    this.messages.update(prev => [...prev, placeholderAssistantMsg]);
    const payload = this.buildRuntimePayload(sessionContext);
    void this.streamRuntimeMessage(payload, assistantMsgId, stream$);

    return stream$.asObservable();
  }

  checkRuntimeHealth(): Observable<{ ok: boolean; model: string; error?: string }> {
    return this.http.get<RuntimeHealthResponse>('/api/ai/health').pipe(
      map((res) => ({
        ok: !!res.ok,
        model: (res.model as SupportedAIModel) || this.selectedModel(),
        error: res.error,
      })),
      catchError((err) => {
        const message =
          typeof err?.error?.error === 'string'
            ? err.error.error
            : 'Groq runtime is unavailable.';
        return of({ ok: false, model: this.selectedModel(), error: message });
      })
    );
  }

  private buildRuntimePayload(context?: Session | null): RuntimeChatPayload {
    const existingMessages = this.messages()
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({
        role: m.role as 'assistant' | 'user' | 'system',
        content: m.content,
      }));

    const systemMessage = context
      ? `You are Makini's Socratic tutor. The learner studied "${context.topic}" for ${context.plannedMinutes} minutes and already completed reflection. Push understanding with Socratic prompts, edge cases, and concise explanations.`
      : `You are Makini's Socratic tutor. Use concise, rigorous educational guidance and ask questions that test retention.`;

    return {
      messages: [
        { role: 'system', content: systemMessage },
        ...existingMessages,
      ],
      sessionId: context?.id,
    };
  }

  private async streamRuntimeMessage(
    payload: RuntimeChatPayload,
    assistantMsgId: string,
    stream$: Subject<string>
  ): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          ...(await this.authHeaders()),
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: this.abortController.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !response.body) {
        const fallback = await this.readError(response);
        this.failAssistant(assistantMsgId, fallback, stream$);
        return;
      }

      if (!contentType.includes('text/event-stream')) {
        const body = (await response.json()) as { assistantText?: string; model?: string; error?: string };
        if (body.assistantText) {
          this.applyDelta(assistantMsgId, body.assistantText);
          this.messages.update(msgs =>
            msgs.map(m => (m.id === assistantMsgId ? { ...m, model: body.model || this.selectedModel() } : m))
          );
          stream$.next(body.assistantText);
          this.isStreaming.set(false);
          stream$.complete();
          return;
        }
        this.failAssistant(assistantMsgId, body.error || 'The tutor returned an empty response.', stream$);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const dataLine = frame.split('\n').find(line => line.startsWith('data: '));
          if (!dataLine) continue;
          let parsed: { delta?: string; done?: boolean; model?: string; error?: string };
          try {
            parsed = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }

          if (parsed.error) {
            this.failAssistant(assistantMsgId, parsed.error, stream$);
            return;
          }
          if (parsed.model) {
            this.messages.update(msgs =>
              msgs.map(m => (m.id === assistantMsgId ? { ...m, model: parsed.model } : m))
            );
          }
          if (parsed.delta) {
            accumulated += parsed.delta;
            this.applyDelta(assistantMsgId, accumulated);
            stream$.next(parsed.delta);
          }
        }
      }

      this.isStreaming.set(false);
      stream$.complete();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.isStreaming.set(false);
        stream$.complete();
        return;
      }
      this.failAssistant(
        assistantMsgId,
        'The AI tutor is currently offline. Set GROQ_API_KEY on the server, then try again.',
        stream$
      );
    }
  }

  private applyDelta(assistantMsgId: string, content: string): void {
    this.messages.update(msgs =>
      msgs.map(m => (m.id === assistantMsgId ? { ...m, content } : m))
    );
  }

  private failAssistant(assistantMsgId: string, fallback: string, stream$: Subject<string>): void {
    this.messages.update(msgs =>
      msgs.map(m =>
        m.id === assistantMsgId ? { ...m, content: fallback, model: 'Groq (offline)' } : m
      )
    );
    this.isStreaming.set(false);
    stream$.complete();
  }

  private async readError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { error?: string };
      if (typeof body.error === 'string' && body.error) return body.error;
    } catch {
      // ignore
    }
    return 'The AI tutor is currently offline. Set GROQ_API_KEY on the server, then try again.';
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.clerk?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
