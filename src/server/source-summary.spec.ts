import { describe, expect, it } from 'vitest';
import {
  buildSourceSummaryUserPrompt,
  canSummarizeStatus,
  resolveSourceSummaryGate,
  sourceSummarySystemPrompt,
} from './source-summary';

describe('source-summary', () => {
  it('allows reflecting and completed sessions only', () => {
    expect(canSummarizeStatus('locked')).toBe(false);
    expect(canSummarizeStatus('reflecting')).toBe(true);
    expect(canSummarizeStatus('completed')).toBe(true);
  });

  it('returns 409-equivalent gate while the timer is still running', () => {
    expect(resolveSourceSummaryGate('locked', null, true)).toEqual({ action: 'not_ready' });
  });

  it('returns cached summaries without calling Groq', () => {
    expect(resolveSourceSummaryGate('reflecting', 'Already written', true)).toEqual({
      action: 'cached',
    });
    expect(resolveSourceSummaryGate('completed', 'Already written', false)).toEqual({
      action: 'cached',
    });
  });

  it('returns unconfigured when Groq is missing and nothing is cached', () => {
    expect(resolveSourceSummaryGate('reflecting', '', false)).toEqual({
      action: 'unconfigured',
    });
  });

  it('generates when the session is ready and Groq is configured', () => {
    expect(resolveSourceSummaryGate('reflecting', null, true)).toEqual({ action: 'generate' });
  });

  it('builds a prompt that includes the topic and sources, not learner notes', () => {
    const system = sourceSummarySystemPrompt();
    expect(system.toLowerCase()).toContain('do not ask for the learner');
    const user = buildSourceSummaryUserPrompt('Recursion', '1. MDN\nURL: https://mdn.test');
    expect(user).toContain('Recursion');
    expect(user).toContain('https://mdn.test');
    expect(user.toLowerCase()).not.toContain('my reflection');
  });
});
