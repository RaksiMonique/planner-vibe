import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfWeek,
} from 'date-fns';
import {
  parseQuarterKey,
  parseYearKey,
  quarterKeyOf,
  quarterRange,
  shiftQuarter,
  shiftYear,
  yearKeyOf,
  yearRange,
} from '@/features/horizons/periods';
import { monthKeyOf, parseMonthKey, shiftMonth } from '@/features/month/grid';
import type { WeekStartsOn } from '@/lib/dates';

/**
 * The period the analytics page reports on: a month ('yyyy-MM'), a quarter
 * ('yyyy-Qn') or a year ('yyyy'). Everything here works on yyyy-MM-dd keys
 * already resolved in the user's time zone, so it is pure and testable.
 */

export const PERIODS = ['month', 'quarter', 'year'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

export const CURRENT_PERIOD_LABELS: Record<Period, string> = {
  month: 'This month',
  quarter: 'This quarter',
  year: 'This year',
};

export type PeriodRange = {
  key: string;
  label: string;
  /** yyyy-MM-dd of the first day. */
  start: string;
  /** yyyy-MM-dd of the last day, inclusive. */
  end: string;
};

/** One column of a trend chart: a day inside a month, a week otherwise. */
export type Bucket = { key: string; label: string; start: string; end: string };

export type ResolvedPeriod = PeriodRange & {
  period: Period;
  /** Calendar days in the period. */
  days: number;
  prevKey: string;
  nextKey: string;
  currentKey: string;
  /** Today falls inside this period. */
  isCurrent: boolean;
  /** The period just before this one, for comparisons. */
  previous: PeriodRange;
  buckets: Bucket[];
};

const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

export function parsePeriod(value: string | string[] | undefined): Period {
  return value === 'quarter' || value === 'year' ? value : 'month';
}

export function periodKeyOf(period: Period, date: Date): string {
  if (period === 'month') return monthKeyOf(date);
  if (period === 'quarter') return quarterKeyOf(date);
  return yearKeyOf(date);
}

/** The first day of the period a key names, or null when the key is malformed. */
export function parsePeriodKey(period: Period, key: string | undefined): Date | null {
  if (period === 'month') return parseMonthKey(key);
  if (period === 'quarter') return parseQuarterKey(key);
  return parseYearKey(key);
}

export function periodRange(period: Period, key: string): PeriodRange {
  if (period === 'month') {
    const first = parseMonthKey(key);
    if (!first) throw new Error(`Not a month key: ${key}`);
    return {
      key,
      label: format(first, 'MMMM yyyy'),
      start: dateKey(first),
      end: dateKey(endOfMonth(first)),
    };
  }
  if (period === 'quarter') {
    const q = quarterRange(key);
    return { key, label: q.label, start: q.start, end: q.end };
  }
  const y = yearRange(key);
  return { key, label: key, start: y.start, end: y.end };
}

export function shiftPeriodKey(period: Period, key: string, delta: number): string {
  if (period === 'month') return shiftMonth(key, delta);
  if (period === 'quarter') return shiftQuarter(key, delta);
  return shiftYear(key, delta);
}

/**
 * Chart columns for [start, end]: every day of a month; otherwise weeks that
 * start on the user's first weekday, the first and last clipped to the range.
 */
export function buildBuckets(
  period: Period,
  start: string,
  end: string,
  weekStartsOn: WeekStartsOn
): Bucket[] {
  const first = parseISO(start);
  const last = parseISO(end);
  const out: Bucket[] = [];
  if (period === 'month') {
    for (let d = first; d <= last; d = addDays(d, 1)) {
      const k = dateKey(d);
      out.push({ key: k, label: format(d, 'd'), start: k, end: k });
    }
    return out;
  }
  let cursor = first;
  while (cursor <= last) {
    const weekEnd = addDays(startOfWeek(cursor, { weekStartsOn }), 6);
    const bucketEnd = weekEnd < last ? weekEnd : last;
    out.push({
      key: dateKey(cursor),
      label: format(cursor, 'd MMM'),
      start: dateKey(cursor),
      end: dateKey(bucketEnd),
    });
    cursor = addDays(bucketEnd, 1);
  }
  return out;
}

/**
 * The period named by `period` and `start` in the search params, falling back
 * to the one that contains today when `start` is missing or malformed.
 */
export function resolvePeriod(
  params: { period?: string | string[]; start?: string | string[] },
  todayKey: string,
  weekStartsOn: WeekStartsOn
): ResolvedPeriod {
  const period = parsePeriod(params.period);
  const currentKey = periodKeyOf(period, parseISO(todayKey));
  const requested = typeof params.start === 'string' ? params.start : undefined;
  const key = requested && parsePeriodKey(period, requested) ? requested : currentKey;
  const range = periodRange(period, key);
  const prevKey = shiftPeriodKey(period, key, -1);
  return {
    ...range,
    period,
    days: differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1,
    prevKey,
    nextKey: shiftPeriodKey(period, key, 1),
    currentKey,
    isCurrent: key === currentKey,
    previous: periodRange(period, prevKey),
    buckets: buildBuckets(period, range.start, range.end, weekStartsOn),
  };
}

/** `/analytics?period=…&start=…`; without `key` the page shows the current period. */
export function analyticsHref(period: Period, key?: string): string {
  const params = new URLSearchParams({ period });
  if (key) params.set('start', key);
  return `/analytics?${params.toString()}`;
}

/**
 * Link to another period length that keeps the reader in the same stretch of
 * time: today's period when the one shown contains today, otherwise the
 * period holding the first day shown.
 */
export function switchPeriodHref(from: ResolvedPeriod, to: Period, todayKey: string): string {
  const anchor = parseISO(from.isCurrent ? todayKey : from.start);
  const key = periodKeyOf(to, anchor);
  return key === periodKeyOf(to, parseISO(todayKey)) ? analyticsHref(to) : analyticsHref(to, key);
}
