import Groq from 'groq-sdk';
import type { SourceLink } from '../app/core/models/session.model';
import { IS_GROQ_CONFIGURED } from './ai.routes';
import { formatExcerptsForPrompt, gatherSourceExcerpts } from './source-text';

const GROQ_API_KEY = process.env['GROQ_API_KEY'] || '';
const GROQ_MODEL = process.env['GROQ_MODEL'] || 'openai/gpt-oss-20b';

export type SummarySessionStatus = 'locked' | 'reflecting' | 'completed';

export function canSummarizeStatus(status: SummarySessionStatus): boolean {
  return status === 'reflecting' || status === 'completed';
}

export type SourceSummaryGate =
  | { action: 'not_ready' }
  | { action: 'cached' }
  | { action: 'unconfigured' }
  | { action: 'generate' };

export function resolveSourceSummaryGate(
  status: SummarySessionStatus,
  existingSummary: string | null | undefined,
  groqConfigured: boolean,
  hasReflection: boolean,
): SourceSummaryGate {
  if (!canSummarizeStatus(status) || !hasReflection) {
    return { action: 'not_ready' };
  }
  if (existingSummary?.trim()) {
    return { action: 'cached' };
  }
  if (!groqConfigured) {
    return { action: 'unconfigured' };
  }
  return { action: 'generate' };
}

export function sourceSummarySystemPrompt(): string {
  return [
    'You summarize study sources for a learner who just finished a Pomodoro focus block.',
    'Write in simple language so they can compare this with their own Feynman explanation.',
    'Ground every claim in the provided excerpts or titles. Cite source titles in parentheses.',
    'Do not invent URLs, papers, or facts that are not in the material.',
    'Do not ask for the learner’s notes and do not rewrite any student text.',
    'Use short paragraphs and a few bullet points for core ideas and edge cases.',
  ].join(' ');
}

export function buildSourceSummaryUserPrompt(topic: string, excerptsBlock: string): string {
  return `Topic: ${topic}\n\nRecommended sources:\n${excerptsBlock}`;
}

export async function generateSourceSummary(
  topic: string,
  sources: SourceLink[],
): Promise<{ text: string; units: number }> {
  if (!IS_GROQ_CONFIGURED) {
    throw new Error('GROQ_NOT_CONFIGURED');
  }

  const excerpts = await gatherSourceExcerpts(sources);
  const client = new Groq({ apiKey: GROQ_API_KEY, timeout: 30_000 });
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.3,
    max_completion_tokens: 1024,
    messages: [
      { role: 'system', content: sourceSummarySystemPrompt() },
      { role: 'user', content: buildSourceSummaryUserPrompt(topic, formatExcerptsForPrompt(excerpts)) },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!text) {
    throw new Error('EMPTY_SUMMARY');
  }

  const units =
    (completion.usage?.prompt_tokens ?? 0) + (completion.usage?.completion_tokens ?? 0);

  return { text, units };
}
