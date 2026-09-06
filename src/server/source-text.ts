import type { SourceLink } from '../app/core/models/session.model';
import { isAiDestination, isSafeHttpUrl } from './topic-sources';

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 32_768;
const MAX_SOURCES = 6;
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export interface SourceExcerpt {
  title: string;
  url: string;
  text: string;
  fromFetch: boolean;
}

export function isAllowedSourceUrl(url: string): boolean {
  return isSafeHttpUrl(url) && !isAiDestination(url);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function fallbackExcerpt(source: SourceLink): SourceExcerpt {
  const parts = [source.description, source.url].filter(part => part.trim().length > 0);
  return {
    title: source.title || source.url,
    url: source.url,
    text: parts.join(' — ').slice(0, 800),
    fromFetch: false,
  };
}

async function fetchExcerpt(source: SourceLink): Promise<SourceExcerpt> {
  if (!isAllowedSourceUrl(source.url)) {
    return fallbackExcerpt(source);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      method: 'GET',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackExcerpt(source);
    }

    const raw = await response.arrayBuffer();
    const bytes = raw.byteLength > MAX_BYTES ? raw.slice(0, MAX_BYTES) : raw;
    const html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const text = stripHtml(html).slice(0, 4_000);

    if (text.length < 40) {
      return fallbackExcerpt(source);
    }

    return {
      title: source.title || source.url,
      url: source.url,
      text,
      fromFetch: true,
    };
  } catch {
    return fallbackExcerpt(source);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pulls short excerpts from recommended session URLs. Failed fetches still
 * contribute title + description so Groq can write an overview.
 */
export async function gatherSourceExcerpts(sources: SourceLink[]): Promise<SourceExcerpt[]> {
  const selected = sources.filter(source => source?.url).slice(0, MAX_SOURCES);
  if (selected.length === 0) return [];

  return Promise.all(selected.map(source => fetchExcerpt(source)));
}

export function formatExcerptsForPrompt(excerpts: SourceExcerpt[]): string {
  if (excerpts.length === 0) {
    return 'No recommended sources were available.';
  }

  return excerpts
    .map((excerpt, index) => {
      const origin = excerpt.fromFetch ? 'page excerpt' : 'title and snippet only';
      return `${index + 1}. ${excerpt.title}\nURL: ${excerpt.url}\n(${origin})\n${excerpt.text}`;
    })
    .join('\n\n');
}
