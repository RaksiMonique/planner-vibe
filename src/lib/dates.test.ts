import { describe, expect, it } from 'vitest';
import {
  dueStatus,
  greetingFor,
  toDateKey,
  todayInZone,
  weekDays,
  weekRange,
  moveWith,
} from './dates';

describe('todayInZone', () => {
  it('uses the local calendar date, not the UTC one', () => {
    // 03:00 UTC on 6 March is still 5 March in Jamaica (UTC-5)
    const now = new Date('2026-03-06T03:00:00Z');
    expect(toDateKey(todayInZone('America/Jamaica', now))).toBe('2026-03-05');
    expect(toDateKey(todayInZone('UTC', now))).toBe('2026-03-06');
  });
});

describe('weekRange and weekDays', () => {
  it('starts the week on Monday when weekStartsOn is 1', () => {
    const wednesday = new Date(2026, 2, 4); // 4 March 2026 is a Wednesday
    const { start, end } = weekRange(wednesday, 1);
    expect(toDateKey(start)).toBe('2026-03-02');
    expect(toDateKey(end)).toBe('2026-03-08');
    expect(weekDays(wednesday, 1).map(toDateKey)).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
    ]);
  });

  it('starts the week on Sunday when weekStartsOn is 0', () => {
    const wednesday = new Date(2026, 2, 4);
    expect(toDateKey(weekRange(wednesday, 0).start)).toBe('2026-03-01');
  });
});

describe('dueStatus', () => {
  const today = new Date(2026, 2, 4); // Wednesday 4 March 2026
  it('classifies relative to today and the current week', () => {
    expect(dueStatus(null, today, 1)).toBe('none');
    expect(dueStatus('2026-03-03', today, 1)).toBe('overdue');
    expect(dueStatus('2026-03-04', today, 1)).toBe('today');
    expect(dueStatus('2026-03-08', today, 1)).toBe('this_week');
    expect(dueStatus('2026-03-09', today, 1)).toBe('later');
  });
  it('respects the week start when deciding "this week"', () => {
    // With a Sunday start, Sunday 8 March belongs to next week
    expect(dueStatus('2026-03-08', today, 0)).toBe('later');
    expect(dueStatus('2026-03-07', today, 0)).toBe('this_week');
  });
});

describe('greetingFor', () => {
  it('changes with the hour', () => {
    expect(greetingFor(6)).toBe('Good morning');
    expect(greetingFor(13)).toBe('Good afternoon');
    expect(greetingFor(20)).toBe('Good evening');
  });
});

describe('moveWith', () => {
  it('keeps the distance when the first day moves', () => {
    expect(moveWith('2027-05-05', '2027-05-03', '2027-05-10')).toBe('2027-05-12');
    expect(moveWith('2027-05-05', '2027-05-03', '2027-04-28')).toBe('2027-04-30');
  });

  it('leaves an empty or unanchored date alone', () => {
    expect(moveWith('', '2027-05-03', '2027-05-10')).toBe('');
    expect(moveWith('2027-05-05', '', '2027-05-10')).toBe('2027-05-05');
    expect(moveWith('2027-05-05', '2027-05-03', '')).toBe('2027-05-05');
  });
});
