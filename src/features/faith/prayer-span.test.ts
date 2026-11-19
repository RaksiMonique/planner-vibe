import { describe, expect, it } from 'vitest';
import { prayerSpan } from './prayer-span';

describe('prayerSpan', () => {
  it('reads today and the future as since today', () => {
    expect(prayerSpan('2026-03-10', '2026-03-10')).toBe('since today');
    expect(prayerSpan('2026-03-12', '2026-03-10')).toBe('since today');
  });

  it('counts days, then weeks, months and years', () => {
    expect(prayerSpan('2026-03-09', '2026-03-10')).toBe('1 day');
    expect(prayerSpan('2026-03-01', '2026-03-10')).toBe('9 days');
    expect(prayerSpan('2026-02-10', '2026-03-10')).toBe('4 weeks');
    expect(prayerSpan('2025-12-10', '2026-03-10')).toBe('3 months');
    expect(prayerSpan('2025-03-01', '2026-03-10')).toBe('1 year');
    expect(prayerSpan('2023-01-01', '2026-03-10')).toBe('3 years');
  });
});
