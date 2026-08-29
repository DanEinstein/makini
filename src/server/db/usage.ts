import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from './client';
import { usageEvents } from './schema';

export type UsageKind = 'groq' | 'elevenlabs';

export async function logUsage(
  userId: string,
  kind: UsageKind,
  units: number,
): Promise<void> {
  if (units <= 0) return;

  await getDb().insert(usageEvents).values({
    userId,
    kind,
    units,
  });
}

export async function usageSince(
  userId: string,
  kind: UsageKind,
  since: Date,
): Promise<number> {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${usageEvents.units}), 0)`,
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.kind, kind),
        gte(usageEvents.createdAt, since),
      ),
    );

  return Number(row?.total ?? 0);
}

export function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
