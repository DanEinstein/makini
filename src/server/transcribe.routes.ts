import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { IS_DATABASE_CONFIGURED, getDb } from './db/client';
import { reflectionTranscripts, sessions } from './db/schema';
import { ensureUser } from './db/users';
import { logUsage, startOfUtcDay, usageSince } from './db/usage';

const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY'] || '';
const MAX_AUDIO_MS = 3 * 60 * 1000;
const DAILY_AUDIO_MS = 10 * 60 * 1000;

function isRealKey(value: string): boolean {
  return value.startsWith('sk_') && !value.includes('replace_me') && value.length > 12;
}

export const IS_ELEVENLABS_CONFIGURED = isRealKey(ELEVENLABS_API_KEY);

function durationOf(req: Request): number {
  const header = req.header('x-audio-duration-ms');
  const parsed = Number(header);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

async function ownedSessionId(userId: string, sessionId: unknown): Promise<string | null> {
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return null;
  }

  const [row] = await getDb()
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);

  return row?.id ?? null;
}

export async function transcribeReflection(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized. Sign in to continue.' });
    return;
  }

  if (!IS_ELEVENLABS_CONFIGURED) {
    res.status(503).json({
      error: 'Spoken reflection is not configured on the server.',
      hint: 'Set ELEVENLABS_API_KEY, then restart.',
    });
    return;
  }

  if (!IS_DATABASE_CONFIGURED) {
    res.status(503).json({
      error: 'Database is not configured.',
      hint: 'Set DATABASE_URL, then run npm run db:migrate.',
    });
    return;
  }

  const body = req.body as Buffer | undefined;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: 'Audio body is required.' });
    return;
  }

  const durationMs = durationOf(req);
  if (durationMs < 3_000) {
    res.status(400).json({ error: 'Speak for at least 3 seconds before stopping.' });
    return;
  }
  if (durationMs > MAX_AUDIO_MS) {
    res.status(400).json({ error: 'Recordings are limited to 3 minutes.' });
    return;
  }

  await ensureUser(userId);

  const usedToday = await usageSince(userId, 'elevenlabs', startOfUtcDay());
  if (usedToday + durationMs > DAILY_AUDIO_MS) {
    res.status(429).json({
      error: 'Daily spoken-reflection limit reached.',
      hint: 'You can still type your reflection.',
    });
    return;
  }

  const sessionId = await ownedSessionId(userId, req.header('x-session-id'));
  const contentType = req.header('content-type') || 'audio/webm';

  try {
    const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
    const file = new Blob([new Uint8Array(body)], { type: contentType });
    const result = await elevenlabs.speechToText.convert({
      file,
      modelId: 'scribe_v2',
      languageCode: 'eng',
      tagAudioEvents: false,
    });

    const text = 'text' in result && typeof result.text === 'string' ? result.text.trim() : '';
    if (!text) {
      res.status(502).json({ error: 'Transcription returned no speech.' });
      return;
    }

    await getDb().insert(reflectionTranscripts).values({
      userId,
      sessionId,
      text,
      durationMs,
    });
    await logUsage(userId, 'elevenlabs', durationMs);

    res.json({ text, durationMs });
  } catch (error) {
    console.error('[makini] ElevenLabs transcription failed:', error);
    res.status(502).json({
      error: 'Transcription failed.',
      details: error instanceof Error ? error.message : 'Unknown transcription error',
    });
  }
}
