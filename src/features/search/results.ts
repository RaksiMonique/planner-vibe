/**
 * Pure helpers shared by the search query, the action and the command palette:
 * the record types search covers, where a hit links to, and how hits are
 * grouped and highlighted. Nothing here touches the database or React.
 */

export const SEARCH_TYPES = [
  'task',
  'goal',
  'project',
  'event',
  'note',
  'quote',
  'journal',
  'habit',
  'routine',
  'recipe',
  'media',
  'bible_study',
  'prayer',
  'course',
  'important',
  'gift',
  'vision_board',
  'product',
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export const TYPE_LABELS: Record<SearchType, string> = {
  task: 'Tasks',
  goal: 'Goals',
  project: 'Projects',
  event: 'Events',
  note: 'Notes',
  quote: 'Quotes',
  journal: 'Journal',
  habit: 'Habits',
  routine: 'Routines',
  recipe: 'Recipes',
  media: 'Media',
  bible_study: 'Bible studies',
  prayer: 'Prayer',
  course: 'Courses',
  important: 'Important information',
  gift: 'Gifts',
  vision_board: 'Vision boards',
  product: 'Self-care products',
};

export type SearchHit = {
  type: SearchType;
  id: string;
  title: string;
  /** Matching fragment with `<mark>`/`</mark>` around the matched words; see `splitHighlights`. */
  snippet: string;
  href: string;
  rank: number;
  /** ISO instant. */
  updatedAt: string;
};

export type SearchGroup = { type: SearchType; label: string; hits: SearchHit[] };

export function isSearchType(value: string): value is SearchType {
  return (SEARCH_TYPES as readonly string[]).includes(value);
}

/**
 * Where a hit opens. `extra` carries the one record detail some routes need:
 * the day for journal entries, prayers and events (`?date=`), nothing for the rest.
 * Only routes that exist under `src/app/(app)` are produced here.
 */
export function hrefFor(hit: { type: SearchType; id: string; extra?: string | null }): string {
  const id = encodeURIComponent(hit.id);
  const day = hit.extra && /^\d{4}-\d{2}-\d{2}$/.test(hit.extra) ? hit.extra : null;
  switch (hit.type) {
    case 'task':
      return `/tasks?task=${id}`;
    case 'goal':
      return `/goals/${id}`;
    case 'project':
      return `/projects/${id}`;
    case 'event':
      return day ? `/calendar?date=${day}` : '/calendar';
    case 'note':
      return '/notes';
    case 'quote':
      return '/notes/quotes';
    case 'journal':
      return day ? `/journal?date=${day}` : '/journal';
    case 'habit':
      return `/habits?habit=${id}`;
    case 'routine':
      return '/routines';
    case 'recipe':
      return `/meals/recipes/${id}`;
    case 'media':
      return `/media/${id}`;
    case 'bible_study':
      return `/bible/${id}`;
    case 'prayer':
      return '/prayer';
    case 'course':
      return `/study/courses/${id}`;
    case 'important':
      return '/important';
    case 'gift':
      return '/gifts';
    case 'vision_board':
      return `/vision-boards/${id}`;
    case 'product':
      return '/wellness/self-care';
  }
}

/**
 * Groups ranked hits by type. Groups keep the order in which their type first
 * appears, so the type holding the best match comes first; within a group the
 * hits keep their rank order.
 */
export function groupHits(hits: SearchHit[]): SearchGroup[] {
  const groups = new Map<SearchType, SearchGroup>();
  for (const hit of hits) {
    let group = groups.get(hit.type);
    if (!group) {
      group = { type: hit.type, label: TYPE_LABELS[hit.type], hits: [] };
      groups.set(hit.type, group);
    }
    group.hits.push(hit);
  }
  return [...groups.values()];
}

export type NavMatchable = { label: string; href: string };

/**
 * Navigation shortcuts whose label matches the query: labels that start with
 * the query first, then labels containing it or with a word starting with it.
 * One character is too little to mean anything, so nothing matches before two.
 */
export function matchNavItems<T extends NavMatchable>(items: T[], query: string, max = 5): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const score = (item: T) => {
    const label = item.label.toLowerCase();
    if (label.startsWith(q)) return 0;
    if (label.split(/[\s-]+/).some((word) => word.startsWith(q))) return 1;
    if (label.includes(q)) return 2;
    if (item.href.slice(1).replace(/[/-]/g, ' ').includes(q)) return 3;
    return null;
  };
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .filter((m): m is { item: T; index: number; score: number } => m.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, max)
    .map((m) => m.item);
}

export type SnippetPart = { text: string; match: boolean };

/** Splits a `ts_headline` snippet into plain and matched runs, so it renders as text, never as HTML. */
export function splitHighlights(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  const re = /<mark>([\s\S]*?)<\/mark>/g;
  let last = 0;
  for (const m of snippet.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: snippet.slice(last, start), match: false });
    if (m[1]) parts.push({ text: m[1], match: true });
    last = start + m[0].length;
  }
  if (last < snippet.length) parts.push({ text: snippet.slice(last), match: false });
  return parts;
}
