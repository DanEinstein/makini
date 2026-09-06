import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fallbackExcerpt,
  formatExcerptsForPrompt,
  gatherSourceExcerpts,
  isAllowedSourceUrl,
  stripHtml,
} from './source-text';

describe('source-text', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('strips scripts and tags', () => {
    const text = stripHtml(
      '<html><script>alert(1)</script><p>Recursion is a function calling itself.</p></html>',
    );
    expect(text).toContain('Recursion is a function calling itself.');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('<p>');
  });

  it('rejects AI destinations and unsafe URLs', () => {
    expect(isAllowedSourceUrl('https://developer.mozilla.org/docs')).toBe(true);
    expect(isAllowedSourceUrl('https://chat.openai.com/c/1')).toBe(false);
    expect(isAllowedSourceUrl('javascript:alert(1)')).toBe(false);
  });

  it('falls back to title and description', () => {
    const excerpt = fallbackExcerpt({
      title: 'MDN Functions',
      description: 'How functions work',
      url: 'https://developer.mozilla.org/functions',
      icon: 'menu_book',
    });
    expect(excerpt.fromFetch).toBe(false);
    expect(excerpt.text).toContain('How functions work');
  });

  it('uses fallback text when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('timeout');
      }),
    );

    const excerpts = await gatherSourceExcerpts([
      {
        title: 'Wikipedia Recursion',
        description: 'Overview article',
        url: 'https://en.wikipedia.org/wiki/Recursion',
        icon: 'menu_book',
      },
    ]);

    expect(excerpts).toHaveLength(1);
    expect(excerpts[0].fromFetch).toBe(false);
    expect(excerpts[0].text).toContain('Overview article');
    expect(formatExcerptsForPrompt(excerpts)).toContain('title and snippet only');
  });

  it('keeps fetched text when the page is usable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () =>
          new TextEncoder().encode(
            '<html><body><p>Tail calls avoid growing the stack when the recursive call is last.</p></body></html>',
          ).buffer,
      })),
    );

    const excerpts = await gatherSourceExcerpts([
      {
        title: 'Tail calls',
        description: '',
        url: 'https://example.com/tail-calls',
        icon: 'menu_book',
      },
    ]);

    expect(excerpts[0].fromFetch).toBe(true);
    expect(excerpts[0].text).toContain('Tail calls avoid growing the stack');
  });
});
