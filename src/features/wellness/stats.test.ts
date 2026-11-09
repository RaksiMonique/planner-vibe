import { describe, expect, it } from 'vitest';
import {
  averages,
  bestAndWorst,
  checkInStreak,
  daysSince,
  lastDays,
  sumValues,
  totalsByDay,
  weeklyAverages,
} from './stats';

const pts = [
  { date: '2026-11-02', mood: 3, energy: 2 },
  { date: '2026-11-03', mood: 5, energy: 4 },
  { date: '2026-11-04', mood: 1, energy: 1 },
  { date: '2026-11-09', mood: 4, energy: 4 },
];

describe('averages', () => {
  it('rounds to one decimal and handles no points', () => {
    expect(averages(pts)).toEqual({ mood: 3.3, energy: 2.8 });
    expect(averages([])).toEqual({ mood: null, energy: null });
  });
});

describe('weeklyAverages', () => {
  it('groups by the week start, oldest first', () => {
    const weeks = weeklyAverages(pts, 1);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-11-02', '2026-11-09']);
    expect(weeks[0]).toMatchObject({ mood: 3, energy: 2.3, count: 3 });
  });
});

describe('bestAndWorst', () => {
  it('finds the high and low mood days', () => {
    const { best, worst } = bestAndWorst(pts);
    expect(best?.date).toBe('2026-11-03');
    expect(worst?.date).toBe('2026-11-04');
    expect(bestAndWorst([])).toEqual({ best: null, worst: null });
  });
});

describe('checkInStreak', () => {
  it('counts consecutive days ending today or yesterday', () => {
    expect(checkInStreak(['2026-11-05', '2026-11-06', '2026-11-07'], '2026-11-07')).toBe(3);
    expect(checkInStreak(['2026-11-05', '2026-11-06'], '2026-11-07')).toBe(2);
    expect(checkInStreak(['2026-11-05'], '2026-11-07')).toBe(0);
    expect(checkInStreak([], '2026-11-07')).toBe(0);
  });
});

describe('day helpers', () => {
  it('lists the last days oldest first', () => {
    expect(lastDays('2026-11-07', 3)).toEqual(['2026-11-05', '2026-11-06', '2026-11-07']);
  });
  it('totals values per day and overall', () => {
    const points = [
      { date: '2026-11-06', value: '1.5' },
      { date: '2026-11-06', value: 0.5 },
      { date: '2026-11-07', value: null },
      { date: '2026-10-01', value: 9 },
    ];
    expect(totalsByDay(points, ['2026-11-06', '2026-11-07'])).toEqual({
      '2026-11-06': 2,
      '2026-11-07': 0,
    });
    expect(sumValues(points)).toBe(11);
  });
  it('measures days since a date', () => {
    expect(daysSince('2026-11-01', '2026-11-07')).toBe(6);
    expect(daysSince('2026-11-09', '2026-11-07')).toBe(-2);
  });
});
