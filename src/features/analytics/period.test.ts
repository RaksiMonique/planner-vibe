import { describe, expect, it } from 'vitest';
import {
  analyticsHref,
  buildBuckets,
  parsePeriod,
  resolvePeriod,
  switchPeriodHref,
} from './period';

const TODAY = '2026-11-11';

describe('parsePeriod', () => {
  it('defaults to month', () => {
    expect(parsePeriod(undefined)).toBe('month');
    expect(parsePeriod('week')).toBe('month');
    expect(parsePeriod(['year'])).toBe('month');
    expect(parsePeriod('quarter')).toBe('quarter');
    expect(parsePeriod('year')).toBe('year');
  });
});

describe('resolvePeriod', () => {
  it('shows the current month without a start', () => {
    const p = resolvePeriod({}, TODAY, 1);
    expect(p).toMatchObject({
      period: 'month',
      key: '2026-11',
      label: 'November 2026',
      start: '2026-11-01',
      end: '2026-11-30',
      days: 30,
      prevKey: '2026-10',
      nextKey: '2026-12',
      currentKey: '2026-11',
      isCurrent: true,
    });
    expect(p.previous).toEqual({
      key: '2026-10',
      label: 'October 2026',
      start: '2026-10-01',
      end: '2026-10-31',
    });
    expect(p.buckets).toHaveLength(30);
    expect(p.buckets[0]).toEqual({
      key: '2026-11-01',
      label: '1',
      start: '2026-11-01',
      end: '2026-11-01',
    });
  });

  it('resolves an explicit quarter and year', () => {
    const q = resolvePeriod({ period: 'quarter', start: '2026-Q1' }, TODAY, 1);
    expect(q).toMatchObject({
      key: '2026-Q1',
      label: 'Q1 2026',
      start: '2026-01-01',
      end: '2026-03-31',
      days: 90,
      prevKey: '2025-Q4',
      nextKey: '2026-Q2',
      currentKey: '2026-Q4',
      isCurrent: false,
    });
    const y = resolvePeriod({ period: 'year', start: '2025' }, TODAY, 1);
    expect(y).toMatchObject({
      key: '2025',
      label: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
      days: 365,
      isCurrent: false,
    });
    expect(y.previous.key).toBe('2024');
  });

  it('falls back to the current period on a malformed start', () => {
    expect(resolvePeriod({ period: 'quarter', start: '2026-11' }, TODAY, 1).key).toBe('2026-Q4');
    expect(resolvePeriod({ period: 'year', start: ['2025'] }, TODAY, 1).key).toBe('2026');
    expect(resolvePeriod({ start: '2026-13' }, TODAY, 1).key).toBe('2026-11');
  });
});

describe('buildBuckets', () => {
  it('cuts a quarter into weeks on the first weekday, clipped to the range', () => {
    // 1 October 2026 is a Thursday and weeks start on Monday.
    const b = buildBuckets('quarter', '2026-10-01', '2026-12-31', 1);
    expect(b[0]).toEqual({
      key: '2026-10-01',
      label: '1 Oct',
      start: '2026-10-01',
      end: '2026-10-04',
    });
    expect(b[1]).toMatchObject({ start: '2026-10-05', end: '2026-10-11' });
    expect(b.at(-1)).toMatchObject({ start: '2026-12-28', end: '2026-12-31' });
    expect(b).toHaveLength(14);
  });

  it('honours the week start', () => {
    const b = buildBuckets('quarter', '2026-10-01', '2026-12-31', 0);
    expect(b[0]).toMatchObject({ start: '2026-10-01', end: '2026-10-03' });
    expect(b[1]).toMatchObject({ start: '2026-10-04', end: '2026-10-10' });
  });

  it('uses every day for a month', () => {
    expect(buildBuckets('month', '2026-02-01', '2026-02-28', 1)).toHaveLength(28);
  });
});

describe('hrefs', () => {
  it('builds links with and without a start', () => {
    expect(analyticsHref('month')).toBe('/analytics?period=month');
    expect(analyticsHref('quarter', '2026-Q4')).toBe('/analytics?period=quarter&start=2026-Q4');
  });

  it('keeps the reader in the same stretch of time when switching the length', () => {
    const current = resolvePeriod({}, TODAY, 1);
    expect(switchPeriodHref(current, 'quarter', TODAY)).toBe('/analytics?period=quarter');
    expect(switchPeriodHref(current, 'year', TODAY)).toBe('/analytics?period=year');

    const past = resolvePeriod({ period: 'quarter', start: '2026-Q1' }, TODAY, 1);
    expect(switchPeriodHref(past, 'month', TODAY)).toBe('/analytics?period=month&start=2026-01');
    expect(switchPeriodHref(past, 'year', TODAY)).toBe('/analytics?period=year');

    const lastYear = resolvePeriod({ period: 'year', start: '2025' }, TODAY, 1);
    expect(switchPeriodHref(lastYear, 'month', TODAY)).toBe(
      '/analytics?period=month&start=2025-01'
    );
    expect(switchPeriodHref(lastYear, 'quarter', TODAY)).toBe(
      '/analytics?period=quarter&start=2025-Q1'
    );
  });
});
