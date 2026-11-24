import { describe, expect, it } from 'vitest';
import { formatTags, parseTags, rankTags } from './tags';

describe('parseTags', () => {
  it('splits on commas, trims, lower-cases and de-duplicates in order', () => {
    expect(parseTags(' Stoicism, how to never finish anything ,stoicism,, Sleep')).toEqual([
      'stoicism',
      'how to never finish anything',
      'sleep',
    ]);
  });
  it('accepts newlines and arrays, collapses inner spaces, caps length and count', () => {
    expect(parseTags('a\nb')).toEqual(['a', 'b']);
    expect(parseTags(['Deep   work'])).toEqual(['deep work']);
    expect(parseTags('x'.repeat(50))[0]).toHaveLength(40);
    expect(parseTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(10);
  });
  it('returns nothing for empty input', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(formatTags([])).toBe('');
  });
});

describe('rankTags', () => {
  it('counts tags across notes, most used first, ties by name', () => {
    expect(rankTags([{ tags: ['b', 'a'] }, { tags: ['a'] }, { tags: [] }])).toEqual([
      { tag: 'a', count: 2 },
      { tag: 'b', count: 1 },
    ]);
  });
});
