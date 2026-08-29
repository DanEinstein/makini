import 'dotenv/config';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { clerkMiddleware, getAuth } from '@clerk/express';
import express, { type NextFunction, type Request, type Response } from 'express';
import { join } from 'node:path';
import { createAiRouter } from './server/ai.routes';
import { IS_DATABASE_CONFIGURED } from './server/db/client';
import { createSessionRouter, requireDatabase } from './server/sessions.routes';
import { createStatsRouter } from './server/stats.routes';
import { transcribeReflection } from './server/transcribe.routes';

const browserDistFolder = join(import.meta.dirname, '../browser');
const CLERK_PUBLISHABLE_KEY = process.env['CLERK_PUBLISHABLE_KEY'] || '';
const CLERK_SECRET_KEY = process.env['CLERK_SECRET_KEY'] || '';
/** Treats the placeholders shipped in .env.example as "not configured". */
function isRealKey(value: string, prefix: string): boolean {
  return value.startsWith(prefix) && !value.includes('replace_me');
}

const IS_CLERK_CONFIGURED =
  isRealKey(CLERK_PUBLISHABLE_KEY, 'pk_') && isRealKey(CLERK_SECRET_KEY, 'sk_');

if (!IS_CLERK_CONFIGURED) {
  console.warn(
    '[makini] CLERK_PUBLISHABLE_KEY and/or CLERK_SECRET_KEY are missing or still ' +
      'placeholders, so /api will return 503. Copy .env.example to .env and paste ' +
      'your real keys from https://dashboard.clerk.com, then restart.',
  );
}

if (!IS_DATABASE_CONFIGURED) {
  console.warn(
    '[makini] DATABASE_URL is not set, so session and stats APIs will return 503. ' +
      'Add the Render Postgres External URL to .env and run npm run db:migrate.',
  );
}

if (!process.env['GROQ_API_KEY'] || process.env['GROQ_API_KEY'].includes('replace_me')) {
  console.warn(
    '[makini] GROQ_API_KEY is not set, so the AI tutor will return 503. ' +
      'Create a key at https://console.groq.com/keys.',
  );
}

if (!process.env['ELEVENLABS_API_KEY'] || process.env['ELEVENLABS_API_KEY'].includes('replace_me')) {
  console.warn(
    '[makini] ELEVENLABS_API_KEY is not set. Typed reflections still work; the mic will return 503.',
  );
}

const app = express();
const angularApp = new AngularNodeAppEngine();

const jsonParser = express.json({ limit: '1mb' });
app.use((req, res, next) => {
  if (req.path === '/api/reflections/transcribe') {
    next();
    return;
  }
  jsonParser(req, res, next);
});

/**
 * Public runtime config consumed by the browser bootstrap before Angular starts.
 * Only values that are safe to expose belong here.
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', (_req, res) => {
  res.json({ clerkPublishableKey: CLERK_PUBLISHABLE_KEY });
});

/**
 * Fail fast with a readable error rather than letting Clerk throw mid-request,
 * which would surface as an HTML 500 with a stack trace.
 */
app.use('/api', (_req, res, next) => {
  if (!IS_CLERK_CONFIGURED) {
    res.status(503).json({
      error: 'Authentication is not configured on the server.',
      hint: 'Set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY, then restart.',
    });
    return;
  }

  next();
});

// Scoped to /api so a misconfigured Clerk key can never take down page rendering.
app.use('/api', clerkMiddleware());

/**
 * Rejects unauthenticated API calls with a 401 instead of redirecting, which is
 * what an XHR client needs. Registered after /api/config so that stays public.
 */
function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized. Sign in to continue.' });
    return;
  }

  next();
}

app.use('/api', requireApiAuth);

app.use('/api/sessions', requireDatabase, createSessionRouter());
app.use('/api/stats', requireDatabase, createStatsRouter());
app.use('/api/ai', createAiRouter());
app.post(
  '/api/reflections/transcribe',
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '25mb' }),
  transcribeReflection,
);

/**
 * Keeps API failures as JSON. Without this, Express' default handler renders an
 * HTML page containing the stack trace and absolute file paths.
 */
app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[makini] Unhandled API error:', err);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
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
