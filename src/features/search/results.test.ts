import { describe, expect, it } from 'vitest';
import {
  groupHits,
  hrefFor,
  matchNavItems,
  SEARCH_TYPES,
  splitHighlights,
  TYPE_LABELS,
  type SearchHit,
} from './results';

const hit = (type: SearchHit['type'], id: string, rank = 1): SearchHit => ({
  type,
  id,
  title: `${type} ${id}`,
  snippet: '',
  href: hrefFor({ type, id }),
  rank,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('hrefFor', () => {
  it('opens records on their own page or with the query parameter the page reads', () => {
    expect(hrefFor({ type: 'task', id: 't1' })).toBe('/tasks?task=t1');
    expect(hrefFor({ type: 'goal', id: 'g1' })).toBe('/goals/g1');
    expect(hrefFor({ type: 'project', id: 'p1' })).toBe('/projects/p1');
    expect(hrefFor({ type: 'habit', id: 'h1' })).toBe('/habits?habit=h1');
    expect(hrefFor({ type: 'recipe', id: 'r1' })).toBe('/meals/recipes/r1');
    expect(hrefFor({ type: 'media', id: 'm1' })).toBe('/media/m1');
    expect(hrefFor({ type: 'bible_study', id: 'b1' })).toBe('/bible/b1');
    expect(hrefFor({ type: 'course', id: 'c1' })).toBe('/study/courses/c1');
    expect(hrefFor({ type: 'vision_board', id: 'v1' })).toBe('/vision-boards/v1');
  });

  it('uses the day for journal entries, prayers and events, and the list page without one', () => {
    expect(hrefFor({ type: 'journal', id: 'j1', extra: '2026-03-04' })).toBe(
      '/journal?date=2026-03-04'
    );
    expect(hrefFor({ type: 'journal', id: 'j1', extra: null })).toBe('/journal');
    expect(hrefFor({ type: 'event', id: 'e1', extra: '2026-03-04' })).toBe(
      '/calendar?date=2026-03-04'
    );
    expect(hrefFor({ type: 'event', id: 'e1', extra: 'not a date' })).toBe('/calendar');
    expect(hrefFor({ type: 'prayer', id: 'p1', extra: '2026-03-04' })).toBe('/prayer');
  });

  it('sends notes and quotes to their own lists and everything else to its module page', () => {
    expect(hrefFor({ type: 'note', id: 'n1' })).toBe('/notes');
    expect(hrefFor({ type: 'quote', id: 'n2' })).toBe('/notes/quotes');
    expect(hrefFor({ type: 'routine', id: 'x' })).toBe('/routines');
    expect(hrefFor({ type: 'important', id: 'x' })).toBe('/important');
    expect(hrefFor({ type: 'gift', id: 'x' })).toBe('/gifts');
    expect(hrefFor({ type: 'product', id: 'x' })).toBe('/wellness/self-care');
  });

  it('escapes ids and covers every type with a label', () => {
    expect(hrefFor({ type: 'goal', id: 'a b/c' })).toBe('/goals/a%20b%2Fc');
    for (const type of SEARCH_TYPES) {
      expect(hrefFor({ type, id: 'id' })).toMatch(/^\//);
      expect(TYPE_LABELS[type]).toBeTruthy();
    }
  });
});

describe('groupHits', () => {
  it('groups by type in order of first appearance and keeps rank order inside a group', () => {
    const groups = groupHits([
      hit('note', 'n1', 0.9),
      hit('task', 't1', 0.8),
      hit('note', 'n2', 0.7),
      hit('goal', 'g1', 0.1),
    ]);
    expect(groups.map((g) => g.type)).toEqual(['note', 'task', 'goal']);
    expect(groups[0].label).toBe('Notes');
    expect(groups[0].hits.map((h) => h.id)).toEqual(['n1', 'n2']);
  });

  it('returns no groups for no hits', () => {
    expect(groupHits([])).toEqual([]);
  });
});

describe('matchNavItems', () => {
  const pages = [
    { label: 'Today', href: '/dashboard' },
    { label: 'This week', href: '/week' },
    { label: 'Habits', href: '/habits' },
    { label: 'Wellness journal', href: '/wellness/journal' },
    { label: 'Journal', href: '/journal' },
    { label: 'Self-care', href: '/wellness/self-care' },
    { label: 'Bible study', href: '/bible' },
  ];

  it('matches labels case-insensitively, whole-label prefixes first', () => {
    expect(matchNavItems(pages, 'jour').map((p) => p.href)).toEqual([
      '/journal',
      '/wellness/journal',
    ]);
    expect(matchNavItems(pages, 'HABITS').map((p) => p.href)).toEqual(['/habits']);
  });

  it('matches a word inside the label and the route path', () => {
    expect(matchNavItems(pages, 'care').map((p) => p.href)).toEqual(['/wellness/self-care']);
    expect(matchNavItems(pages, 'dashboard').map((p) => p.href)).toEqual(['/dashboard']);
    expect(matchNavItems(pages, 'wellness').map((p) => p.href)).toEqual([
      '/wellness/journal',
      '/wellness/self-care',
    ]);
  });

  it('needs at least two characters and respects the maximum', () => {
    expect(matchNavItems(pages, 'j')).toEqual([]);
    expect(matchNavItems(pages, '  ')).toEqual([]);
    expect(matchNavItems(pages, 'e', 1)).toEqual([]);
    expect(matchNavItems(pages, 'al', 1)).toHaveLength(1);
  });
});

describe('splitHighlights', () => {
  it('splits a headline into plain and matched runs', () => {
    expect(splitHighlights('Call the <mark>bank</mark> about the <mark>fees</mark>')).toEqual([
      { text: 'Call the ', match: false },
      { text: 'bank', match: true },
      { text: ' about the ', match: false },
      { text: 'fees', match: true },
    ]);
  });

  it('returns one plain run when nothing is marked and nothing for an empty snippet', () => {
    expect(splitHighlights('plain text')).toEqual([{ text: 'plain text', match: false }]);
    expect(splitHighlights('')).toEqual([]);
  });
});
