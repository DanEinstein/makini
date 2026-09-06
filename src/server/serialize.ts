import type { Session, SessionReflection } from '../app/core/models/session.model';
import { toEpochMs } from '../shared/epoch';
import type { reflections, sessions } from './db/schema';

export type SessionRow = typeof sessions.$inferSelect;
export type ReflectionRow = typeof reflections.$inferSelect;

/**
 * Postgres timestamps become epoch milliseconds so the wire format matches the
 * client's existing Session model exactly.
 */
export function toApiReflection(row: ReflectionRow): SessionReflection {
  return {
    text: row.text,
    selfCheck: {
      explainWithoutNotes: row.explainWithoutNotes,
      identifyEdgeCases: row.identifyEdgeCases,
      teachSomeoneElse: row.teachSomeoneElse,
    },
    confidenceRating: row.confidenceRating,
    submittedAt: toEpochMs(row.submittedAt),
    inputMode: row.inputMode,
  };
}

export function toApiSession(row: SessionRow, reflection?: ReflectionRow | null): Session {
  return {
    id: row.id,
    topic: row.topic,
    plannedMinutes: row.plannedMinutes,
    startedAt: toEpochMs(row.startedAt),
    endedAt: row.endedAt ? toEpochMs(row.endedAt) : undefined,
    status: row.status,
    scratchpadNotes: row.scratchpadNotes,
    sources: row.sources,
    reflection: reflection ? toApiReflection(reflection) : undefined,
  };
}
