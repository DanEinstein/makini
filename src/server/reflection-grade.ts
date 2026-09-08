import Groq from 'groq-sdk';
import type { ReflectionGrade } from '../app/core/models/session.model';
import { IS_GROQ_CONFIGURED } from './ai.routes';

const GROQ_API_KEY = process.env['GROQ_API_KEY'] || '';
const GROQ_MODEL = process.env['GROQ_MODEL'] || 'openai/gpt-oss-20b';

export const RELEARN_THRESHOLD = 40;

export type GradeVerdict = ReflectionGrade['verdict'];

export type GradeSessionStatus = 'locked' | 'reflecting' | 'completed';

export type GradeGate =
  | { action: 'not_ready' }
  | { action: 'cached' }
  | { action: 'unconfigured' }
  | { action: 'generate' };

export function verdictFor(score: number): GradeVerdict {
  return score < RELEARN_THRESHOLD ? 'relearn' : 'proceed';
}

export function resolveGradeGate(
  status: GradeSessionStatus,
  reflection: { gradedAt?: Date | string | null } | null | undefined,
  groqConfigured: boolean,
): GradeGate {
  if (status !== 'completed' || !reflection) {
    return { action: 'not_ready' };
  }
  if (reflection.gradedAt) {
    return { action: 'cached' };
  }
  if (!groqConfigured) {
    return { action: 'unconfigured' };
  }
  return { action: 'generate' };
}

export function gradeSystemPrompt(): string {
  return [
    "You grade a learner's Feynman explanation against an independent source summary.",
    'Score coverage and accuracy of the ideas, not writing quality or length.',
    'Reply with JSON only in this exact shape:',
    '{"score": number, "covered": string[], "missed": string[], "note": string}',
    'score is an integer from 0 to 100.',
    'covered lists up to 5 ideas they explained correctly.',
    'missed lists up to 5 important ideas from the summary they omitted or got wrong.',
    'note is one or two short sentences of coaching.',
    'Do not invent facts that are not in the summary.',
  ].join(' ');
}

export function buildGradeUserPrompt(topic: string, summary: string, learnerText: string): string {
  return `Topic: ${topic}\n\nSource summary:\n${summary}\n\nLearner explanation:\n${learnerText}`;
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function asTrimmedList(value: unknown, cap = 5): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, cap);
}

export function parseGradeResponse(raw: string): Omit<ReflectionGrade, 'verdict'> {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('GRADE_UNPARSEABLE');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new Error('GRADE_UNPARSEABLE');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('GRADE_UNPARSEABLE');
  }

  const obj = parsed as Record<string, unknown>;
  const scoreNum = Number(obj['score']);
  if (!Number.isFinite(scoreNum)) {
    throw new Error('GRADE_UNPARSEABLE');
  }

  const note = typeof obj['note'] === 'string' ? obj['note'].trim() : '';

  return {
    score: Math.round(Math.min(100, Math.max(0, scoreNum))),
    covered: asTrimmedList(obj['covered']),
    missed: asTrimmedList(obj['missed']),
    note,
  };
}

export async function gradeReflection(
  topic: string,
  summary: string,
  learnerText: string,
): Promise<{ grade: ReflectionGrade; units: number }> {
  if (!IS_GROQ_CONFIGURED) {
    throw new Error('GROQ_NOT_CONFIGURED');
  }

  const client = new Groq({ apiKey: GROQ_API_KEY, timeout: 30_000 });
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0,
    max_completion_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: gradeSystemPrompt() },
      { role: 'user', content: buildGradeUserPrompt(topic, summary, learnerText) },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  const parsed = parseGradeResponse(raw);
  const grade: ReflectionGrade = {
    ...parsed,
    verdict: verdictFor(parsed.score),
  };

  const units =
    (completion.usage?.prompt_tokens ?? 0) + (completion.usage?.completion_tokens ?? 0);

  return { grade, units };
}
