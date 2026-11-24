import { describe, expect, it } from 'vitest';
import { hashString, pickSomeday } from './someday';

const items = ['Learn the cello', 'Walk the coast path', 'Write the family history', 'Keep bees'];

describe('pickSomeday', () => {
  it('returns nothing from an empty pile', () => {
    expect(pickSomeday([], '2026-11-23')).toBeNull();
  });
  it('picks the same item all week', () => {
    const a = pickSomeday(items, '2026-11-23');
    expect(a).not.toBeNull();
    expect(pickSomeday(items, '2026-11-23')).toBe(a);
    expect(items).toContain(a);
  });
  it('is the only item when there is one', () => {
    expect(pickSomeday(['Keep bees'], '2026-11-23')).toBe('Keep bees');
  });
  it('moves around over the weeks', () => {
    const weeks = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
    const picks = new Set(weeks.map((w) => pickSomeday(items, w)));
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('hashString', () => {
  it('is stable and non-negative', () => {
    expect(hashString('2026-11-23')).toBe(hashString('2026-11-23'));
    expect(hashString('2026-11-23')).toBeGreaterThanOrEqual(0);
    expect(hashString('')).toBeGreaterThanOrEqual(0);
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
