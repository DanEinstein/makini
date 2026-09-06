import type { SourceLink } from '../app/core/models/session.model';
import { DEFAULT_SOURCES } from '../shared/session-defaults';

const DDG_HTML_URL = 'https://html.duckduckgo.com/html/';
const SEARCH_TIMEOUT_MS = 4_000;
const MAX_SOURCES = 6;

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

/** Hostnames (and path prefixes) that must never appear as Pomodoro references. */
export const AI_DOMAIN_DENYLIST: ReadonlyArray<string> = [
  'chat.openai.com',
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'bard.google.com',
  'perplexity.ai',
  'you.com',
  'poe.com',
  'character.ai',
  'copilot.microsoft.com',
  'phind.com',
  'forefront.ai',
  'meta.ai',
  'chat.deepseek.com',
  'grok.x.ai',
  'x.ai',
];

const AI_PATH_HOSTS: ReadonlyArray<{ host: string; pathPrefix: string }> = [
  { host: 'bing.com', pathPrefix: '/chat' },
  { host: 'www.bing.com', pathPrefix: '/chat' },
  { host: 'huggingface.co', pathPrefix: '/chat' },
];

interface RawSearchHit {
  title: string;
  url: string;
  description: string;
}

/**
 * Builds a learning-biased DuckDuckGo query from the session topic.
 */
export function buildTopicQuery(topic: string): string {
  const cleaned = topic.trim().replace(/\s+/g, ' ');
  return `${cleaned} tutorial OR explained OR documentation OR guide`;
}

/**
 * Unwraps DuckDuckGo redirect links (`/l/?uddg=...`) to the real destination.
 */
export function unwrapDuckDuckGoUrl(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;

  try {
    const absolute = new URL(trimmed, 'https://duckduckgo.com');
    const uddg = absolute.searchParams.get('uddg');
    if (uddg) {
      return decodeURIComponent(uddg);
    }
    if (absolute.protocol === 'http:' || absolute.protocol === 'https:') {
      return absolute.href;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Accepts only absolute http(s) URLs suitable for external reference cards.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isAiDestination(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.toLowerCase();

    if (AI_DOMAIN_DENYLIST.some(blocked => host === blocked || host.endsWith(`.${blocked}`))) {
      return true;
    }

    return AI_PATH_HOSTS.some(rule => {
      const ruleHost = rule.host.replace(/^www\./, '');
      const matchesHost = host === ruleHost || host.endsWith(`.${ruleHost}`);
      return matchesHost && path.startsWith(rule.pathPrefix);
    });
  } catch {
    return true;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function dedupeKey(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${host}${path}`;
  } catch {
    return url;
  }
}

/**
 * Parses DuckDuckGo HTML result blocks into raw hits (pre-filter).
 * Dependency-free: targets the classic `result__a` / `result__snippet` markup.
 */
export function parseDuckDuckGoHtml(html: string): RawSearchHit[] {
  const hits: RawSearchHit[] = [];
  const resultBlocks = html.split(/class="[^"]*result__body[^"]*"/i);

  for (const block of resultBlocks.slice(1)) {
    const linkMatch = block.match(
      /class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!linkMatch) continue;

    const href = decodeHtmlEntities(linkMatch[1] ?? '');
    const title = stripTags(linkMatch[2] ?? '');
    if (!href || !title) continue;

    const snippetMatch = block.match(
      /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/i,
    );
    const description = snippetMatch ? stripTags(snippetMatch[1] ?? '') : '';

    hits.push({ title, url: href, description });
  }

  // Fallback: any result__a anchors if body split failed.
  if (hits.length === 0) {
    const anchorRe =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = anchorRe.exec(html)) !== null) {
      hits.push({
        title: stripTags(match[2] ?? ''),
        url: decodeHtmlEntities(match[1] ?? ''),
        description: '',
      });
    }
  }

  return hits;
}

/**
 * Filters, unwraps, and maps raw hits into session SourceLink cards.
 */
export function mapHitsToSources(hits: RawSearchHit[], limit = MAX_SOURCES): SourceLink[] {
  const seen = new Set<string>();
  const sources: SourceLink[] = [];

  for (const hit of hits) {
    const unwrapped = unwrapDuckDuckGoUrl(hit.url);
    if (!unwrapped || !isSafeHttpUrl(unwrapped) || isAiDestination(unwrapped)) {
      continue;
    }

    const key = dedupeKey(unwrapped);
    if (seen.has(key)) continue;
    seen.add(key);

    sources.push({
      title: hit.title.slice(0, 120) || hostnameOf(unwrapped),
      description: (hit.description || `Reference from ${hostnameOf(unwrapped)}`).slice(0, 240),
      url: unwrapped,
      icon: 'menu_book',
    });

    if (sources.length >= limit) break;
  }

  return sources;
}

async function fetchDuckDuckGoHtml(topic: string): Promise<string> {
  const query = buildTopicQuery(topic);
  const url = `${DDG_HTML_URL}?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo responded with ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches DuckDuckGo HTML for learning references related to `topic`.
 * Returns DEFAULT_SOURCES when search fails or yields nothing usable.
 */
export async function searchTopicSources(topic: string): Promise<SourceLink[]> {
  const trimmed = topic.trim();
  if (!trimmed) {
    return DEFAULT_SOURCES;
  }

  try {
    const html = await fetchDuckDuckGoHtml(trimmed);
    const sources = mapHitsToSources(parseDuckDuckGoHtml(html));
    if (sources.length === 0) {
      console.warn('[makini] DuckDuckGo returned no usable topic sources; using defaults.');
      return DEFAULT_SOURCES;
    }
    return sources;
  } catch (error) {
    console.warn('[makini] Topic source search failed; using defaults.', error);
    return DEFAULT_SOURCES;
  }
}
