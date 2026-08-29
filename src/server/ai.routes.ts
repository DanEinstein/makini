import { and, eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { getAuth } from '@clerk/express';
import Groq from 'groq-sdk';
import { IS_DATABASE_CONFIGURED, getDb } from './db/client';
import { chatMessages, sessions } from './db/schema';
import { ensureUser } from './db/users';
import { logUsage } from './db/usage';

const GROQ_API_KEY = process.env['GROQ_API_KEY'] || '';
const GROQ_MODEL = process.env['GROQ_MODEL'] || 'openai/gpt-oss-20b';

function isRealKey(value: string): boolean {
  return value.startsWith('gsk_') && !value.includes('replace_me');
}

export const IS_GROQ_CONFIGURED = isRealKey(GROQ_API_KEY);

type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(raw => {
      if (!raw || typeof raw !== 'object') return null;
      const role = (raw as { role?: unknown }).role;
      const content = (raw as { content?: unknown }).content;
      if (
        (role === 'system' || role === 'user' || role === 'assistant') &&
        typeof content === 'string' &&
        content.trim().length > 0
      ) {
        return { role, content: content.trim() } as ChatMessage;
      }
      return null;
    })
    .filter((m): m is ChatMessage => !!m);
}

function groqClient(): Groq {
  return new Groq({ apiKey: GROQ_API_KEY, timeout: 30_000 });
}

async function ownedSessionId(userId: string, sessionId: unknown): Promise<string | null> {
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return null;
  }
  if (!IS_DATABASE_CONFIGURED) return null;

  const [row] = await getDb()
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);

  return row?.id ?? null;
}

async function persistMessage(
  sessionId: string | null,
  role: 'user' | 'assistant',
  content: string,
  model?: string,
): Promise<void> {
  if (!sessionId || !IS_DATABASE_CONFIGURED || !content.trim()) return;

  await getDb().insert(chatMessages).values({
    sessionId,
    role,
    content,
    model: model ?? null,
  });
}

export function createAiRouter(): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    if (!IS_GROQ_CONFIGURED) {
      return res.json({
        ok: false,
        provider: 'groq',
        model: GROQ_MODEL,
        error: 'GROQ_API_KEY is not configured.',
      });
    }

    try {
      const startedAt = Date.now();
      const listed = await groqClient().models.list();
      const availableModels = listed.data?.map(model => model.id).filter(Boolean) ?? [];

      return res.json({
        ok: true,
        provider: 'groq',
        model: GROQ_MODEL,
        latencyMs: Date.now() - startedAt,
        availableModels,
      });
    } catch (error) {
      return res.status(503).json({
        ok: false,
        provider: 'groq',
        model: GROQ_MODEL,
        error: error instanceof Error ? error.message : 'Groq is unreachable',
      });
    }
  });

  router.post('/chat', async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized. Sign in to continue.' });
      return;
    }

    if (!IS_GROQ_CONFIGURED) {
      res.status(503).json({
        error: 'AI tutor is not configured on the server.',
        hint: 'Set GROQ_API_KEY, then restart.',
        provider: 'groq',
        model: GROQ_MODEL,
      });
      return;
    }

    const messages = sanitizeMessages(req.body?.messages);
    if (!messages.length) {
      res.status(400).json({ error: 'Invalid request. Provide a non-empty messages array.' });
      return;
    }

    if (IS_DATABASE_CONFIGURED) {
      await ensureUser(userId);
    }

    const sessionId = await ownedSessionId(userId, req.body?.sessionId);
    const lastUser = [...messages].reverse().find(message => message.role === 'user');
    if (lastUser) {
      await persistMessage(sessionId, 'user', lastUser.content);
    }

    const abort = new AbortController();
    const onClose = () => abort.abort();
    req.on('close', onClose);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let assistantText = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const stream = await groqClient().chat.completions.create(
        {
          model: GROQ_MODEL,
          messages,
          stream: true,
          temperature: 0.4,
          max_completion_tokens: 2048,
        },
        { signal: abort.signal },
      );

      for await (const chunk of stream) {
        if (abort.signal.aborted) break;

        const usage = chunk.x_groq?.usage;
        if (usage) {
          promptTokens = usage.prompt_tokens ?? promptTokens;
          completionTokens = usage.completion_tokens ?? completionTokens;
        }

        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          assistantText += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

      if (!abort.signal.aborted) {
        await persistMessage(sessionId, 'assistant', assistantText, GROQ_MODEL);
        if (IS_DATABASE_CONFIGURED) {
          await logUsage(userId, 'groq', promptTokens + completionTokens);
        }
        res.write(
          `data: ${JSON.stringify({
            done: true,
            model: GROQ_MODEL,
            assistantText,
          })}\n\n`,
        );
      }
    } catch (error) {
      if (!abort.signal.aborted && !res.headersSent) {
        res.status(503).json({
          error: 'Unable to reach Groq.',
          provider: 'groq',
          model: GROQ_MODEL,
          details: error instanceof Error ? error.message : 'Unknown runtime error',
        });
        req.off('close', onClose);
        return;
      }

      if (!abort.signal.aborted && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            error: error instanceof Error ? error.message : 'Groq request failed',
          })}\n\n`,
        );
      }
    } finally {
      req.off('close', onClose);
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  return router;
}
