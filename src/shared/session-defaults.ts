import type { SourceLink } from '../app/core/models/session.model';

/** Shared by the client (for display) and the server (when creating sessions). */
export const DEFAULT_SOURCES: SourceLink[] = [
  {
    title: 'MDN Docs',
    description: 'Core documentation on functions, syntax, and execution environments.',
    url: 'https://developer.mozilla.org',
    icon: 'description'
  },
  {
    title: 'Google Scholar',
    description: 'Academic papers on computational theory, algorithms, and cognitive science.',
    url: 'https://scholar.google.com',
    icon: 'school'
  },
  {
    title: 'Wikipedia',
    description: 'Overview of foundational principles, proofs, and historical context.',
    url: 'https://wikipedia.org',
    icon: 'language'
  }
];
