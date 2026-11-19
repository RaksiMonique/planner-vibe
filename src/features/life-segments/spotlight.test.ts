import { describe, expect, it } from 'vitest';
import { spotlightIndex } from './spotlight';

describe('spotlightIndex', () => {
  it('rotates through the segments one a day', () => {
    expect(spotlightIndex('2026-01-01', 10)).toBe(0);
    expect(spotlightIndex('2026-01-02', 10)).toBe(1);
    expect(spotlightIndex('2026-01-11', 10)).toBe(0);
  });

  it('stays inside the count', () => {
    for (let i = 0; i < 31; i++) {
      const key = `2026-12-${String(i + 1).padStart(2, '0')}`;
      const idx = spotlightIndex(key, 3);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(3);
    }
  });

  it('is the same for the same day', () => {
    expect(spotlightIndex('2026-11-19', 7)).toBe(spotlightIndex('2026-11-19', 7));
  });

  it('returns -1 with nothing to pick from', () => {
    expect(spotlightIndex('2026-11-19', 0)).toBe(-1);
  });

  it('falls back to the first on a malformed key', () => {
    expect(spotlightIndex('nope', 4)).toBe(0);
  });
});
