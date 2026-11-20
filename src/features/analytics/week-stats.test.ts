import { describe, expect, it } from 'vitest';
import { deltaLabel, formatHours, weekKeys, weekLabel } from './week-stats';

describe('weekKeys', () => {
  it('finds a Monday-start week and the one before it', () => {
    // 2026-11-19 is a Thursday.
    expect(weekKeys('2026-11-19', 1)).toEqual({
      current: { start: '2026-11-16', end: '2026-11-22' },
      previous: { start: '2026-11-09', end: '2026-11-15' },
    });
  });
  it('respects a Sunday start and crosses month ends', () => {
    expect(weekKeys('2026-12-01', 0)).toEqual({
      current: { start: '2026-11-29', end: '2026-12-05' },
      previous: { start: '2026-11-22', end: '2026-11-28' },
    });
  });
  it('keeps the first day of the week as its own start', () => {
    expect(weekKeys('2026-11-16', 1).current.start).toBe('2026-11-16');
  });
});

describe('weekLabel', () => {
  it('names the month once inside one month', () => {
    expect(weekLabel({ start: '2026-11-16', end: '2026-11-22' })).toBe('16 to 22 Nov');
  });
  it('names both months when the week straddles them', () => {
    expect(weekLabel({ start: '2026-11-30', end: '2026-12-06' })).toBe('30 Nov to 6 Dec');
  });
});

describe('formatHours', () => {
  it('rounds to one decimal and drops a trailing zero', () => {
    expect(formatHours(90)).toBe('1.5');
    expect(formatHours(60)).toBe('1');
    expect(formatHours(100)).toBe('1.7');
    expect(formatHours(0)).toBe('0');
  });
  it('never shows negative or -0', () => {
    expect(formatHours(-30)).toBe('0');
    expect(formatHours(-1)).toBe('0');
  });
});

describe('deltaLabel', () => {
  it('signs the change with a proper minus', () => {
    expect(deltaLabel(5, 3)).toBe('+2 vs last week');
    expect(deltaLabel(1, 4)).toBe('−3 vs last week');
  });
  it('says so when nothing changed', () => {
    expect(deltaLabel(2, 2)).toBe('same as last week');
    expect(deltaLabel(0, 0)).toBe('same as last week');
  });
});
