import { and, desc, eq, inArray } from 'drizzle-orm';
import { Router, type Request } from 'express';
import { getAuth } from '@clerk/express';
import type { ConfidenceDataPoint, StatsSummary } from '../app/core/models/stats.model';
import { getDb } from './db/client';
import { reflections, sessions } from './db/schema';
import { ensureUser } from './db/users';
import { toApiSession } from './serialize';

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekdayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function currentStreakDays(activityDays: Set<string>): number {
  const today = startOfUtcDay(new Date());
  let cursor = activityDays.has(dayKey(today)) ? today : addUtcDays(today, -1);
  let streak = 0;

  while (activityDays.has(dayKey(cursor))) {
    streak += 1;
    cursor = addUtcDays(cursor, -1);
  }

  return streak;
}

export function createStatsRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res) => {
    const userId = getAuth(req).userId as string;
    await ensureUser(userId);

    const timeframe = req.query['timeframe'] === '30d' ? '30d' : '7d';
    const windowDays = timeframe === '30d' ? 30 : 7;
    const windowStart = addUtcDays(startOfUtcDay(new Date()), -(windowDays - 1));

    const completed = await getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.status, 'completed')))
      .orderBy(desc(sessions.startedAt));

    const allReflections =
      completed.length === 0
        ? []
        : await getDb()
            .select()
            .from(reflections)
            .where(
              inArray(
                reflections.sessionId,
                completed.map(row => row.id),
              ),
            );

    const reflectionBySession = new Map(allReflections.map(row => [row.sessionId, row] as const));

    const totalMinutes = completed.reduce((sum, row) => sum + row.plannedMinutes, 0);
    const topicsMastered = completed.filter(
      row => (reflectionBySession.get(row.id)?.confidenceRating ?? 0) >= 4,
    ).length;

    const activityDays = new Set(
      completed.map(row => dayKey(row.endedAt ?? row.startedAt)),
    );

    const inWindow = completed.filter(
      row => (row.endedAt ?? row.startedAt) >= windowStart,
    );

    let confidenceTrend: ConfidenceDataPoint[];

    if (timeframe === '7d') {
      confidenceTrend = Array.from({ length: 7 }, (_, index) => {
        const date = addUtcDays(windowStart, index);
        const key = dayKey(date);
        const thatDay = inWindow.filter(row => dayKey(row.endedAt ?? row.startedAt) === key);
        const scores = thatDay
          .map(row => reflectionBySession.get(row.id)?.confidenceRating)
          .filter((value): value is number => typeof value === 'number');
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return {
          date: key,
          label: weekdayLabel(date),
          score: Math.round(avg * 20),
          topic: thatDay[0]?.topic,
        };
      });
    } else {
      const weeks = 5;
      confidenceTrend = Array.from({ length: weeks }, (_, index) => {
        const weekStart = addUtcDays(windowStart, index * 7);
        const weekEnd = addUtcDays(weekStart, 7);
        const thatWeek = inWindow.filter(row => {
          const at = row.endedAt ?? row.startedAt;
          return at >= weekStart && at < weekEnd;
        });
        const scores = thatWeek
          .map(row => reflectionBySession.get(row.id)?.confidenceRating)
          .filter((value): value is number => typeof value === 'number');
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return {
          date: dayKey(weekStart),
          label: `W${index + 1}`,
          score: Math.round(avg * 20),
        };
      });
    }

    const recentSessions = completed.slice(0, 5).map(row =>
      toApiSession(row, reflectionBySession.get(row.id) ?? null),
    );

    const stats: StatsSummary = {
      totalStudyHours: Math.round((totalMinutes / 60) * 10) / 10,
      currentStreakDays: currentStreakDays(activityDays),
      topicsMastered,
      confidenceTrend,
      recentSessions,
    };

    res.json(stats);
  });

  return router;
}
