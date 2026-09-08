import type { ReflectionGrade, Session, SessionReflection } from '../app/core/models/session.model';
import { toEpochMs } from '../shared/epoch';
import type { reflections, sessions } from './db/schema';

export type SessionRow = typeof sessions.$inferSelect;
export type ReflectionRow = typeof reflections.$inferSelect;

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function toApiGrade(row: ReflectionRow): ReflectionGrade | undefined {
  if (row.gradeScore == null || (row.gradeVerdict !== 'relearn' && row.gradeVerdict !== 'proceed')) {
    return undefined;
  }

  const feedback = row.gradeFeedback;
  return {
    score: row.gradeScore,
    verdict: row.gradeVerdict,
    covered: asStringList(feedback?.covered),
    missed: asStringList(feedback?.missed),
    note: typeof feedback?.note === 'string' ? feedback.note : '',
  };
}

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
    grade: toApiGrade(row),
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
    sourceSummary: row.sourceSummary ?? undefined,
    reflection: reflection ? toApiReflection(reflection) : undefined,
  };
}
