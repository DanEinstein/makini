import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env['OLLAMA_MODEL'] || 'gemma3:4b';

const app = express();
const angularApp = new AngularNodeAppEngine();
app.use(express.json({ limit: '1mb' }));

type OllamaChatRole = 'system' | 'user' | 'assistant';

interface OllamaChatMessage {
  role: OllamaChatRole;
  content: string;
}

interface OllamaChatRequest {
  messages: OllamaChatMessage[];
}

function sanitizeMessages(value: unknown): OllamaChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const role = (raw as { role?: unknown }).role;
      const content = (raw as { content?: unknown }).content;
      if (
        (role === 'system' || role === 'user' || role === 'assistant') &&
        typeof content === 'string' &&
        content.trim().length > 0
      ) {
        return { role, content: content.trim() } as OllamaChatMessage;
      }
      return null;
    })
    .filter((m): m is OllamaChatMessage => !!m);
}

/**
 * Health endpoint for local Ollama runtime.
 */
app.get('/api/ai/health', async (_req, res) => {
  try {
    const startedAt = Date.now();
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return res.status(503).json({
        ok: false,
        provider: 'ollama',
        model: OLLAMA_MODEL,
        error: `Ollama responded with status ${response.status}`,
      });
    }

    const data = (await response.json()) as { models?: Array<{ name?: string }> };
    const availableModels = Array.isArray(data.models)
      ? data.models.map((m) => m.name).filter((name): name is string => !!name)
      : [];

    return res.json({
      ok: true,
      provider: 'ollama',
      model: OLLAMA_MODEL,
      latencyMs: Date.now() - startedAt,
      availableModels,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      provider: 'ollama',
      model: OLLAMA_MODEL,
      error: error instanceof Error ? error.message : 'Ollama runtime is unreachable',
    });
  }
});

/**
 * Chat completion endpoint backed by local Ollama Gemma.
 */
app.post('/api/ai/chat', async (req, res) => {
  const startedAt = Date.now();
  const body = req.body as Partial<OllamaChatRequest> | undefined;
  const messages = sanitizeMessages(body?.messages);

  if (!messages.length) {
    return res.status(400).json({
      error: 'Invalid request. Provide a non-empty messages array.',
    });
  }

  try {
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      const rawError = await ollamaResponse.text();
      return res.status(502).json({
        error: 'Gemma chat request failed',
        provider: 'ollama',
        model: OLLAMA_MODEL,
        status: ollamaResponse.status,
        details: rawError,
      });
    }

    const data = (await ollamaResponse.json()) as {
      message?: { content?: string };
      model?: string;
    };

    const assistantText = data.message?.content?.trim() || '';
    if (!assistantText) {
      return res.status(502).json({
        error: 'Gemma returned an empty response',
        provider: 'ollama',
        model: data.model || OLLAMA_MODEL,
      });
    }

    return res.json({
      assistantText,
      model: data.model || OLLAMA_MODEL,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return res.status(503).json({
      error: 'Unable to reach local Ollama runtime',
      provider: 'ollama',
      model: OLLAMA_MODEL,
      latencyMs: Date.now() - startedAt,
      details: error instanceof Error ? error.message : 'Unknown runtime error',
    });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
