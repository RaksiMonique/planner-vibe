import {
  addMonths,
  addQuarters,
  addYears,
  endOfQuarter,
  endOfYear,
  format,
  parseISO,
  startOfQuarter,
  startOfYear,
} from 'date-fns';

/** 'yyyy-Qn' keys for the quarterly view and 'yyyy' for the annual view. */

export function quarterKeyOf(d: Date): string {
  return `${format(d, 'yyyy')}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

export function parseQuarterKey(key: string | undefined): Date | null {
  const m = key?.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return null;
  return new Date(Number(m[1]), (Number(m[2]) - 1) * 3, 1);
}

export type QuarterRange = {
  key: string;
  label: string;
  start: string;
  end: string;
  /** 'yyyy-MM' of the three months. */
  months: string[];
};

export function quarterRange(key: string): QuarterRange {
  const first = parseQuarterKey(key);
  if (!first) throw new Error(`Not a quarter key: ${key}`);
  return {
    key,
    label: `Q${Math.floor(first.getMonth() / 3) + 1} ${format(first, 'yyyy')}`,
    start: format(startOfQuarter(first), 'yyyy-MM-dd'),
    end: format(endOfQuarter(first), 'yyyy-MM-dd'),
    months: [0, 1, 2].map((i) => format(addMonths(first, i), 'yyyy-MM')),
  };
}

export function shiftQuarter(key: string, delta: number): string {
  const first = parseQuarterKey(key);
  if (!first) throw new Error(`Not a quarter key: ${key}`);
  return quarterKeyOf(addQuarters(first, delta));
}

export function yearKeyOf(d: Date): string {
  return format(d, 'yyyy');
}

export function parseYearKey(key: string | undefined): Date | null {
  if (!key || !/^\d{4}$/.test(key)) return null;
  return new Date(Number(key), 0, 1);
}

export type YearRange = {
  key: string;
  start: string;
  end: string;
  quarters: QuarterRange[];
  /** 'yyyy-MM' for January to December. */
  months: string[];
};

export function yearRange(key: string): YearRange {
  const first = parseYearKey(key);
  if (!first) throw new Error(`Not a year key: ${key}`);
  return {
    key,
    start: format(startOfYear(first), 'yyyy-MM-dd'),
    end: format(endOfYear(first), 'yyyy-MM-dd'),
    quarters: [0, 1, 2, 3].map((q) => quarterRange(`${key}-Q${q + 1}`)),
    months: Array.from({ length: 12 }, (_, i) => format(addMonths(first, i), 'yyyy-MM')),
  };
}

export function shiftYear(key: string, delta: number): string {
  const first = parseYearKey(key);
  if (!first) throw new Error(`Not a year key: ${key}`);
  return yearKeyOf(addYears(first, delta));
}

export function monthLabel(monthKey: string, pattern = 'MMM yyyy'): string {
  return format(parseISO(`${monthKey}-01`), pattern);
}

/** Inclusive comparison of 'yyyy-MM-dd' keys; a missing date is never in range. */
export function inRange(dateKey: string | null | undefined, start: string, end: string): boolean {
  return !!dateKey && dateKey >= start && dateKey <= end;
}

export function monthOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}
