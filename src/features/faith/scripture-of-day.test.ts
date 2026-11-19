import { describe, expect, it } from 'vitest';
import { pickScriptureOfDay } from './scripture-of-day';

const ref = (id: string, flags: { fav?: boolean; mark?: boolean } = {}) => ({
  id,
  isFavourite: flags.fav ?? false,
  isBookmark: flags.mark ?? false,
});

describe('pickScriptureOfDay', () => {
  it('returns null when nothing is favourited or bookmarked', () => {
    expect(pickScriptureOfDay([], '2026-01-01')).toBeNull();
    expect(pickScriptureOfDay([ref('a')], '2026-01-01')).toBeNull();
  });

  it('prefers favourites over bookmarks', () => {
    const picked = pickScriptureOfDay(
      [ref('a', { mark: true }), ref('b', { fav: true })],
      '2026-01-01'
    );
    expect(picked?.id).toBe('b');
  });

  it('falls back to bookmarks', () => {
    expect(pickScriptureOfDay([ref('a', { mark: true }), ref('b')], '2026-01-01')?.id).toBe('a');
  });

  it('walks the pool by day of year, whatever order the rows arrive in', () => {
    const refs = [ref('c', { fav: true }), ref('a', { fav: true }), ref('b', { fav: true })];
    expect(pickScriptureOfDay(refs, '2026-01-01')?.id).toBe('a');
    expect(pickScriptureOfDay(refs, '2026-01-02')?.id).toBe('b');
    expect(pickScriptureOfDay(refs, '2026-01-03')?.id).toBe('c');
    expect(pickScriptureOfDay(refs, '2026-01-04')?.id).toBe('a');
    expect(pickScriptureOfDay([...refs].reverse(), '2026-01-02')?.id).toBe('b');
  });
});
