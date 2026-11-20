import { describe, expect, it } from 'vitest';
import { currentStreak, dayKeys, longestStreak } from './streak';

describe('dayKeys', () => {
  it('ends on today, oldest first', () => {
    expect(dayKeys('2026-11-19', 3)).toEqual(['2026-11-17', '2026-11-18', '2026-11-19']);
  });
  it('crosses a month boundary', () => {
    expect(dayKeys('2026-11-01', 2)).toEqual(['2026-10-31', '2026-11-01']);
  });
});

describe('currentStreak', () => {
  it('counts back from today', () => {
    expect(currentStreak(['2026-11-17', '2026-11-18', '2026-11-19'], '2026-11-19')).toBe(3);
  });
  it('still counts when today is blank but yesterday was written', () => {
    expect(currentStreak(['2026-11-17', '2026-11-18'], '2026-11-19')).toBe(2);
  });
  it('is zero after a missed day', () => {
    expect(currentStreak(['2026-11-16', '2026-11-17'], '2026-11-19')).toBe(0);
    expect(currentStreak([], '2026-11-19')).toBe(0);
  });
  it('stops at a gap and ignores duplicates', () => {
    expect(
      currentStreak(['2026-11-19', '2026-11-19', '2026-11-18', '2026-11-15'], '2026-11-19')
    ).toBe(2);
  });
});

describe('longestStreak', () => {
  it('finds the longest run, in any order', () => {
    expect(
      longestStreak(['2026-11-19', '2026-11-03', '2026-11-01', '2026-11-02', '2026-11-18'])
    ).toBe(3);
  });
  it('is one for scattered days and zero for none', () => {
    expect(longestStreak(['2026-11-01', '2026-11-05'])).toBe(1);
    expect(longestStreak([])).toBe(0);
  });
});
