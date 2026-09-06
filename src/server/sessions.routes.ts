import { and, desc, eq, inArray } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { getAuth } from '@clerk/express';
import type { Session, SessionReflection, SourceLink } from '../app/core/models/session.model';
import { DEFAULT_SOURCES } from '../shared/session-defaults';
import { getDb, IS_DATABASE_CONFIGURED } from './db/client';
import { chatMessages, reflections, sessions } from './db/schema';
import { ensureUser } from './db/users';
import { IS_GROQ_CONFIGURED } from './ai.routes';
import { logUsage } from './db/usage';
import { toApiSession, type ReflectionRow, type SessionRow } from './serialize';
import { generateSourceSummary, resolveSourceSummaryGate } from './source-summary';
import { searchTopicSources } from './topic-sources';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireDatabase(_req: Request, res: Response, next: () => void): void {
  if (!IS_DATABASE_CONFIGURED) {
    res.status(503).json({
      error: 'Database is not configured.',
      hint: 'Set DATABASE_URL to your Render Postgres External URL, then run npm run db:migrate.',
    });
    return;
  }
  next();
}

function userIdOf(req: Request): string {
  return getAuth(req).userId as string;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function parseSources(value: unknown): SourceLink[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_SOURCES;
  }
  return value
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, unknown>;
      if (typeof raw['title'] !== 'string' || typeof raw['url'] !== 'string') return null;
      return {
        title: raw['title'],
        description: typeof raw['description'] === 'string' ? raw['description'] : '',
        url: raw['url'],
        icon: typeof raw['icon'] === 'string' ? raw['icon'] : 'description',
      };
    })
    .filter((item): item is SourceLink => item !== null);
}

async function reflectionMap(sessionIds: string[]): Promise<Map<string, ReflectionRow>> {
  const map = new Map<string, ReflectionRow>();
  if (sessionIds.length === 0) return map;

  const rows = await getDb()
    .select()
    .from(reflections)
    .where(inArray(reflections.sessionId, sessionIds));

  for (const row of rows) {
    map.set(row.sessionId, row);
  }
  return map;
}

async function attach(row: SessionRow): Promise<Session> {
  const map = await reflectionMap([row.id]);
  return toApiSession(row, map.get(row.id) ?? null);
}

async function ownedSession(userId: string, sessionId: string): Promise<SessionRow | null> {
  if (!isUuid(sessionId)) return null;
  const [row] = await getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  return row ?? null;
}

export function createSessionRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const userId = userIdOf(req);
    await ensureUser(userId);

    const rows = await getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.status, 'completed')))
      .orderBy(desc(sessions.startedAt));

    const map = await reflectionMap(rows.map(row => row.id));
    res.json({ sessions: rows.map(row => toApiSession(row, map.get(row.id) ?? null)) });
  });

  router.get('/active', async (req, res) => {
    const userId = userIdOf(req);
    await ensureUser(userId);

    const [row] = await getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), inArray(sessions.status, ['locked', 'reflecting'])))
      .orderBy(desc(sessions.startedAt))
      .limit(1);

    res.json({ session: row ? await attach(row) : null });
  });

  router.post('/', async (req, res) => {
    const userId = userIdOf(req);
    await ensureUser(userId);

    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const plannedMinutes = Number(req.body?.plannedMinutes);

    if (!topic || !Number.isFinite(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 240) {
      res.status(400).json({ error: 'Provide a topic and a duration between 1 and 240 minutes.' });
      return;
    }

    const [existing] = await getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), inArray(sessions.status, ['locked', 'reflecting'])))
      .limit(1);

    if (existing) {
      res.status(409).json({
        error: 'An active focus session is already in progress.',
        session: await attach(existing),
      });
      return;
    }

    const sources = await searchTopicSources(topic);

    const [created] = await getDb()
      .insert(sessions)
      .values({
        userId,
        topic,
        plannedMinutes: Math.round(plannedMinutes),
        startedAt: new Date(),
        status: 'locked',
        scratchpadNotes: '',
        sources: sources.length > 0 ? sources : DEFAULT_SOURCES,
      })
      .returning();

    res.status(201).json({ session: await attach(created) });
  });

  router.post('/import', async (req, res) => {
    const userId = userIdOf(req);
    await ensureUser(userId);

    const incoming = Array.isArray(req.body?.sessions) ? req.body.sessions : [];
    let imported = 0;

    for (const raw of incoming) {
      if (!raw || typeof raw !== 'object') continue;
      const topic = typeof raw.topic === 'string' ? raw.topic.trim() : '';
      const plannedMinutes = Number(raw.plannedMinutes);
      if (!topic || !Number.isFinite(plannedMinutes) || plannedMinutes < 1) continue;

      const startedAt = typeof raw.startedAt === 'number' ? new Date(raw.startedAt) : new Date();
      const endedAt = typeof raw.endedAt === 'number' ? new Date(raw.endedAt) : null;
      const reflection = raw.reflection as SessionReflection | undefined;

      if (!reflection || typeof reflection.text !== 'string') continue;

      const [created] = await getDb()
        .insert(sessions)
        .values({
          userId,
          topic,
          plannedMinutes: Math.round(plannedMinutes),
          startedAt,
          endedAt,
          status: 'completed',
          scratchpadNotes: typeof raw.scratchpadNotes === 'string' ? raw.scratchpadNotes : '',
          sources: parseSources(raw.sources),
        })
        .returning();

      await getDb().insert(reflections).values({
        sessionId: created.id,
        text: reflection.text,
        inputMode: reflection.inputMode === 'spoken' ? 'spoken' : 'typed',
        explainWithoutNotes: Boolean(reflection.selfCheck?.explainWithoutNotes),
        identifyEdgeCases: Boolean(reflection.selfCheck?.identifyEdgeCases),
        teachSomeoneElse: Boolean(reflection.selfCheck?.teachSomeoneElse),
        confidenceRating: Math.min(5, Math.max(1, Number(reflection.confidenceRating) || 3)),
        submittedAt: new Date(reflection.submittedAt || Date.now()),
      });

      imported += 1;
    }

    res.json({ imported });
  });

  router.get('/:id/messages', async (req, res) => {
    const userId = userIdOf(req);
    const current = await ownedSession(userId, req.params['id'] ?? '');
    if (!current) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    const rows = await getDb()
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, current.id))
      .orderBy(chatMessages.createdAt);

    res.json({
      messages: rows.map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        timestamp: row.createdAt.getTime(),
        model: row.model ?? undefined,
      })),
    });
  });

  router.patch('/:id/scratchpad', async (req, res) => {
    const userId = userIdOf(req);
    const current = await ownedSession(userId, req.params['id'] ?? '');
    if (!current) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    if (current.status !== 'locked') {
      res.status(409).json({ error: 'Scratchpad can only be edited during a locked session.' });
      return;
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes : '';
    const [updated] = await getDb()
      .update(sessions)
      .set({ scratchpadNotes: notes })
      .where(eq(sessions.id, current.id))
      .returning();

    res.json({ session: await attach(updated) });
  });

  router.post('/:id/end', async (req, res) => {
    const userId = userIdOf(req);
    const current = await ownedSession(userId, req.params['id'] ?? '');
    if (!current) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    if (current.status !== 'locked') {
      res.json({ session: await attach(current) });
      return;
    }

    const [updated] = await getDb()
      .update(sessions)
      .set({ status: 'reflecting', endedAt: new Date() })
      .where(eq(sessions.id, current.id))
      .returning();

    res.json({ session: await attach(updated) });
  });

  /**
   * Drops an unfinished locked/reflecting session so the learner can start a
   * fresh Pomodoro. Completed sessions are left alone.
   */
  router.post('/:id/cancel', async (req, res) => {
    const userId = userIdOf(req);
    const current = await ownedSession(userId, req.params['id'] ?? '');
    if (!current) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    if (current.status === 'completed') {
      res.status(409).json({ error: 'Completed sessions cannot be cancelled.' });
      return;
    }

    await getDb().delete(sessions).where(eq(sessions.id, current.id));
    res.json({ ok: true, id: current.id });
  });

  /**
   * Independent source-based summary for the Feynman compare pane.
   * Does not read the learner's reflection text.
   */
  router.post('/:id/source-summary', async (req, res) => {
    const userId = userIdOf(req);
    const current = await ownedSession(userId, req.params['id'] ?? '');
    if (!current) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    const gate = resolveSourceSummaryGate(current.status, current.sourceSummary, IS_GROQ_CONFIGURED);
    if (gate.action === 'not_ready') {
      res.status(409).json({ error: 'Finish the focus timer before requesting a source summary.' });
      return;
    }
    if (gate.action === 'cached') {
      res.json({ summary: current.sourceSummary, cached: true });
      return;
    }
    if (gate.action === 'unconfigured') {
      res.status(503).json({
        error: 'AI summary is not configured on the server.',
        hint: 'Set GROQ_API_KEY, then restart.',
      });
      return;
    }

    try {
      const generated = await generateSourceSummary(current.topic, current.sources ?? []);
      const [updated] = await getDb()
        .update(sessions)
        .set({ sourceSummary: generated.text })
        .where(eq(sessions.id, current.id))
        .returning();

      if (generated.units > 0) {
        await logUsage(userId, 'groq', generated.units);
      }

      res.json({
        summary: updated.sourceSummary ?? generated.text,
        cached: false,
        session: await attach(updated),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'GROQ_NOT_CONFIGURED') {
        res.status(503).json({ error: 'AI summary is not configured on the server.' });
        return;
      }
      console.error('[makini] Source summary failed.', error);
      res.status(503).json({ error: 'Unable to summarize the recommended sources.' });
    }
  });

  router.post('/:id/reflection', async (req, res) => {
    const userId = userIdOf(req);
    const current = await ownedSession(userId, req.params['id'] ?? '');
    if (!current) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    if (current.status === 'completed') {
      res.json({ session: await attach(current) });
      return;
    }
    if (current.status !== 'reflecting') {
      res.status(409).json({ error: 'Finish the focus timer before submitting a reflection.' });
      return;
    }

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const confidenceRating = Number(req.body?.confidenceRating);
    const selfCheck = req.body?.selfCheck as SessionReflection['selfCheck'] | undefined;
    const inputMode = req.body?.inputMode === 'spoken' ? 'spoken' : 'typed';

    if (text.length < 10 || !Number.isInteger(confidenceRating) || confidenceRating < 1 || confidenceRating > 5) {
      res.status(400).json({ error: 'Reflection needs at least 10 characters and a 1–5 confidence rating.' });
      return;
    }

    const [updated] = await getDb().transaction(async tx => {
      await tx.insert(reflections).values({
        sessionId: current.id,
        text,
        inputMode,
        explainWithoutNotes: Boolean(selfCheck?.explainWithoutNotes),
        identifyEdgeCases: Boolean(selfCheck?.identifyEdgeCases),
        teachSomeoneElse: Boolean(selfCheck?.teachSomeoneElse),
        confidenceRating,
        submittedAt: new Date(),
      });

      return tx
        .update(sessions)
        .set({ status: 'completed', endedAt: current.endedAt ?? new Date() })
        .where(eq(sessions.id, current.id))
        .returning();
    });

    res.json({ session: await attach(updated) });
  });

  return router;
}
