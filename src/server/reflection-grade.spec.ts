import { describe, expect, it } from 'vitest';
import {
  buildGradeUserPrompt,
  gradeSystemPrompt,
  parseGradeResponse,
  resolveGradeGate,
  verdictFor,
} from './reflection-grade';

describe('reflection-grade', () => {
  it('returns relearn below 40 and proceed at or above 40', () => {
    expect(verdictFor(39)).toBe('relearn');
    expect(verdictFor(40)).toBe('proceed');
    expect(verdictFor(41)).toBe('proceed');
  });

  it('parses clean JSON and clamps the score', () => {
    expect(
      parseGradeResponse(
        '{"score": 72.4, "covered": ["base case"], "missed": ["stack"], "note": "Clear."}',
      ),
    ).toEqual({
      score: 72,
      covered: ['base case'],
      missed: ['stack'],
      note: 'Clear.',
    });
    expect(parseGradeResponse('{"score": 150, "covered": [], "missed": [], "note": ""}').score).toBe(
      100,
    );
    expect(parseGradeResponse('{"score": -3, "covered": [], "missed": [], "note": ""}').score).toBe(0);
  });

  it('parses fenced JSON and caps covered/missed lists', () => {
    const raw = '```json\n{"score": 55, "covered": ["a", "b", "c", "d", "e", "f"], "missed": ["x"], "note": "ok"}\n```';
    const parsed = parseGradeResponse(raw);
    expect(parsed.score).toBe(55);
    expect(parsed.covered).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(parsed.missed).toEqual(['x']);
    expect(parsed.note).toBe('ok');
  });

  it('throws GRADE_UNPARSEABLE for malformed input instead of inventing a score', () => {
    expect(() => parseGradeResponse('not json')).toThrowError('GRADE_UNPARSEABLE');
    expect(() => parseGradeResponse('{"covered": ["a"]}')).toThrowError('GRADE_UNPARSEABLE');
    expect(() => parseGradeResponse('')).toThrowError('GRADE_UNPARSEABLE');
  });

  it('maps the grade route to 409 before completion, cached when already graded, and 503 when unconfigured', () => {
    expect(resolveGradeGate('reflecting', { gradedAt: null }, true)).toEqual({ action: 'not_ready' });
    expect(resolveGradeGate('completed', null, true)).toEqual({ action: 'not_ready' });
    expect(resolveGradeGate('completed', { gradedAt: new Date() }, true)).toEqual({
      action: 'cached',
    });
    expect(resolveGradeGate('completed', { gradedAt: null }, false)).toEqual({
      action: 'unconfigured',
    });
    expect(resolveGradeGate('completed', { gradedAt: null }, true)).toEqual({ action: 'generate' });
  });

  it('builds a prompt that includes the summary and the learner text', () => {
    const system = gradeSystemPrompt();
    expect(system.toLowerCase()).toContain('json');
    const user = buildGradeUserPrompt('Recursion', 'A function calls itself.', 'It calls itself.');
    expect(user).toContain('Recursion');
    expect(user).toContain('A function calls itself.');
    expect(user).toContain('It calls itself.');
  });
});
