import { describe, expect, it } from 'vitest';
import {
  completionRate,
  currentStreak,
  longestStreak,
  periodSummary,
  type StreakInput,
} from './streaks';

const daily = (dates: string[], todayKey = '2026-11-07'): StreakInput => ({
  checkIns: dates.map((date) => ({ date })),
  frequency: 'daily',
  target: 1,
  todayKey,
  weekStartsOn: 1,
});

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(currentStreak(daily(['2026-11-05', '2026-11-06', '2026-11-07']))).toBe(3);
  });
  it('allows today to be open: a streak ending yesterday still counts', () => {
    expect(currentStreak(daily(['2026-11-04', '2026-11-05', '2026-11-06']))).toBe(3);
  });
  it('breaks on a missed day before yesterday', () => {
    expect(currentStreak(daily(['2026-11-03', '2026-11-05', '2026-11-06']))).toBe(2);
    expect(currentStreak(daily(['2026-11-01', '2026-11-02']))).toBe(0);
  });
  it('works per week with a target', () => {
    const input: StreakInput = {
      // week of 2 Nov: 3 check-ins, week of 26 Oct: 3, week of 19 Oct: 1
      checkIns: [
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-10-27',
        '2026-10-28',
        '2026-10-30',
        '2026-10-20',
      ].map((date) => ({ date })),
      frequency: 'weekly',
      target: 3,
      todayKey: '2026-11-07',
      weekStartsOn: 1,
    };
    expect(currentStreak(input)).toBe(2);
    expect(longestStreak(input)).toBe(2);
  });
  it('treats check-in values as multiple occurrences', () => {
    const input: StreakInput = {
      checkIns: [{ date: '2026-11-07', value: 2 }],
      frequency: 'daily',
      target: 2,
      todayKey: '2026-11-07',
      weekStartsOn: 1,
    };
    expect(currentStreak(input)).toBe(1);
  });
});

describe('longestStreak', () => {
  it('finds the best run anywhere in the history', () => {
    expect(
      longestStreak(
        daily(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-06', '2026-11-07'])
      )
    ).toBe(4);
    expect(longestStreak(daily([]))).toBe(0);
  });
});

describe('completionRate', () => {
  it('is the share of the target achieved over the window', () => {
    const dates = Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 24).padStart(2, '0')}`)
      .filter((d) => d <= '2026-10-31')
      .concat([
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
        '2026-11-06',
        '2026-11-07',
      ]);
    // 8 October days + 7 November days = 15 of the last 30
    expect(completionRate(daily(dates))).toBe(50);
  });
  it('caps each period at its target', () => {
    const input: StreakInput = {
      checkIns: [{ date: '2026-11-07', value: 10 }],
      frequency: 'monthly',
      target: 4,
      todayKey: '2026-11-07',
      weekStartsOn: 1,
    };
    // window covers October and November: 4 of 8 possible
    expect(completionRate(input)).toBe(50);
  });
});

describe('periodSummary', () => {
  it('describes the current week for a weekly habit', () => {
    const s = periodSummary({
      checkIns: [{ date: '2026-11-03' }, { date: '2026-11-05' }],
      frequency: 'weekly',
      target: 3,
      todayKey: '2026-11-07',
      weekStartsOn: 1,
    });
    expect(s).toMatchObject({
      startKey: '2026-11-02',
      endKey: '2026-11-08',
      count: 2,
      met: false,
      remaining: 1,
    });
  });
});
