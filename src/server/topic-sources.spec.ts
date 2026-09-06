import { describe, expect, it, vi, afterEach } from 'vitest';
import { DEFAULT_SOURCES } from '../shared/session-defaults';
import {
  buildTopicQuery,
  isAiDestination,
  isSafeHttpUrl,
  mapHitsToSources,
  parseDuckDuckGoHtml,
  searchTopicSources,
  unwrapDuckDuckGoUrl,
} from './topic-sources';

const SAMPLE_HTML = `
<html><body>
  <div class="result__body">
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FJavaScript%2FGuide%2FFunctions">
      MDN Functions Guide
    </a>
    <a class="result__snippet">Learn how functions work in JavaScript.</a>
  </div>
  <div class="result__body">
    <a class="result__a" href="https://chat.openai.com/">Ask ChatGPT</a>
    <a class="result__snippet">AI chat — should be filtered.</a>
  </div>
  <div class="result__body">
    <a class="result__a" href="https://en.wikipedia.org/wiki/Recursion">Recursion — Wikipedia</a>
    <a class="result__snippet">Overview of recursion in computer science.</a>
  </div>
  <div class="result__body">
    <a class="result__a" href="javascript:alert(1)">Bad link</a>
  </div>
  <div class="result__body">
    <a class="result__a" href="https://claude.ai/chat">Claude</a>
  </div>
</body></html>
`;

describe('topic-sources', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a learning-biased query from the topic', () => {
    expect(buildTopicQuery('  Call Stack  ')).toContain('Call Stack');
    expect(buildTopicQuery('recursion')).toMatch(/tutorial OR explained/);
  });

  it('unwraps DuckDuckGo redirect URLs', () => {
    expect(
      unwrapDuckDuckGoUrl(
        '//duckduckgo.com/l/?uddg=https%3A%2F%2Fdeveloper.mozilla.org%2Fdocs',
      ),
    ).toBe('https://developer.mozilla.org/docs');
  });

  it('validates http(s) URLs only', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('/relative')).toBe(false);
  });

  it('flags AI destinations', () => {
    expect(isAiDestination('https://chat.openai.com/c/123')).toBe(true);
    expect(isAiDestination('https://www.perplexity.ai/search')).toBe(true);
    expect(isAiDestination('https://huggingface.co/chat')).toBe(true);
    expect(isAiDestination('https://www.bing.com/chat')).toBe(true);
    expect(isAiDestination('https://developer.mozilla.org/docs')).toBe(false);
  });

  it('parses DDG HTML and filters AI / unsafe links', () => {
    const sources = mapHitsToSources(parseDuckDuckGoHtml(SAMPLE_HTML));
    expect(sources.length).toBe(2);
    expect(sources.map(s => s.url)).toEqual([
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions',
      'https://en.wikipedia.org/wiki/Recursion',
    ]);
    expect(sources.every(s => s.icon === 'menu_book')).toBe(true);
    expect(sources[0].title).toContain('MDN');
  });

  it('parses live-style result__a anchors when result__body is missing', () => {
    const liveStyle = `
      <h2 class="result__title">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.geeksforgeeks.org%2Fdsa%2Fintroduction%2Dto%2Drecursion%2F&amp;rut=abc">
          Introduction to Recursion
        </a>
      </h2>
    `;
    const sources = mapHitsToSources(parseDuckDuckGoHtml(liveStyle));
    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe(
      'https://www.geeksforgeeks.org/dsa/introduction-to-recursion/',
    );
  });

  it('returns DEFAULT_SOURCES when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    const sources = await searchTopicSources('recursion');
    expect(sources).toEqual(DEFAULT_SOURCES);
  });

  it('returns mapped sources when DuckDuckGo HTML is usable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => SAMPLE_HTML,
      })),
    );

    const sources = await searchTopicSources('functions');
    expect(sources).toHaveLength(2);
    expect(sources[0].url).toContain('developer.mozilla.org');
  });
});
