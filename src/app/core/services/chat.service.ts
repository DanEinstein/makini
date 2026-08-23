import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, firstValueFrom, map, of } from 'rxjs';
import { ChatMessage, AIModelOption, SupportedAIModel } from '../models/chat.model';
import { Session } from '../models/session.model';

export const AI_MODELS: AIModelOption[] = [
  { id: 'gemma3:4b', label: 'Gemma 3 4B', provider: 'Ollama' },
];

interface RuntimeHealthResponse {
  ok: boolean;
  model?: string;
  error?: string;
}

interface RuntimeChatResponse {
  assistantText: string;
  model: string;
  latencyMs: number;
  error?: string;
}

interface RuntimeChatPayload {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);

  readonly selectedModel = signal<SupportedAIModel>('gemma3:4b');
  readonly messages = signal<ChatMessage[]>([]);
  readonly isStreaming = signal<boolean>(false);

  constructor() {
    this.initDefaultMessages();
  }

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
    const payload = this.buildRuntimePayload(userPrompt, sessionContext);
    void this.resolveRuntimeMessage(payload, assistantMsgId, stream$);

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
            : 'Local Ollama runtime is unavailable.';
        return of({ ok: false, model: this.selectedModel(), error: message });
      })
    );
  }

  private initDefaultMessages(): void {
    this.messages.set([
      {
        id: 'msg_demo_1',
        role: 'assistant',
        content: `Welcome to your local Gemma tutor. Complete a focus session, then ask me to test your understanding with drills or edge cases.`,
        timestamp: Date.now() - 120000,
        model: 'Gemma 3 4B'
      }
    ]);
  }

  private buildRuntimePayload(userPrompt: string, context?: Session | null): RuntimeChatPayload {
    const existingMessages = this.messages()
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({
        role: m.role as 'assistant' | 'user' | 'system',
        content: m.content,
      }));

    const systemMessage = context
      ? `You are Makini's local Gemma tutor. The learner studied "${context.topic}" for ${context.plannedMinutes} minutes and already completed reflection. Push understanding with Socratic prompts, edge cases, and concise explanations.`
      : `You are Makini's local Gemma tutor. Use concise, rigorous educational guidance and ask questions that test retention.`;

    return {
      messages: [
        { role: 'system', content: systemMessage },
        ...existingMessages,
        { role: 'user', content: userPrompt },
      ],
    };
  }

  private async resolveRuntimeMessage(
    payload: RuntimeChatPayload,
    assistantMsgId: string,
    stream$: Subject<string>
  ): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<RuntimeChatResponse>('/api/ai/chat', payload)
      );
      const modelLabel = response.model || this.selectedModel();
      this.messages.update((msgs) =>
        msgs.map((m) =>
          m.id === assistantMsgId ? { ...m, model: modelLabel } : m
        )
      );
      this.streamAssistantText(response.assistantText, assistantMsgId, stream$);
    } catch {
      const fallback = 'Gemma is currently offline. Start Ollama and run `ollama pull gemma3:4b`, then try again.';
      this.messages.update((msgs) =>
        msgs.map((m) =>
          m.id === assistantMsgId ? { ...m, content: fallback, model: 'Gemma (offline)' } : m
        )
      );
      this.isStreaming.set(false);
      stream$.complete();
    }
  }

  private streamAssistantText(
    fullResponse: string,
    assistantMsgId: string,
    stream$: Subject<string>
  ): void {
    const tokens = fullResponse.split(/(\s+)/);
    let tokenIdx = 0;
    let accumulated = '';

    const intervalId = setInterval(() => {
      if (tokenIdx < tokens.length) {
        const chunk = tokens[tokenIdx];
        accumulated += chunk;
        tokenIdx++;

        this.messages.update((msgs) =>
          msgs.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
        );
        stream$.next(chunk);
      } else {
        clearInterval(intervalId);
        this.isStreaming.set(false);
        stream$.complete();
      }
    }, 22);
  }
}
