import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { WeekStartsOn } from '@/lib/dates';

export type MonthCell = { key: string; inMonth: boolean };
export type MonthRow = { start: string; end: string; cells: MonthCell[] };

const toKey = (d: Date) => format(d, 'yyyy-MM-dd');

export function monthKeyOf(d: Date): string {
  return format(d, 'yyyy-MM');
}

/** 'yyyy-MM' to the first of that month, or null when malformed. */
export function parseMonthKey(key: string | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return null;
  const d = parse(key, 'yyyy-MM', new Date(2000, 0, 1));
  return isValid(d) ? d : null;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const d = parseMonthKey(monthKey) ?? new Date();
  return monthKeyOf(addMonths(d, delta));
}

/** Rows of seven cells covering the month, padded to whole weeks. */
export function buildMonthGrid(monthKey: string, weekStartsOn: WeekStartsOn): MonthRow[] {
  const first = parseMonthKey(monthKey);
  if (!first) throw new Error(`Bad month key: ${monthKey}`);
  const month = monthKeyOf(first);
  let cursor = startOfWeek(startOfMonth(first), { weekStartsOn });
  const last = endOfWeek(endOfMonth(first), { weekStartsOn });
  const rows: MonthRow[] = [];
  while (cursor <= last) {
    const cells: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(cursor, i);
      cells.push({ key: toKey(d), inMonth: monthKeyOf(d) === month });
    }
    rows.push({ start: cells[0].key, end: cells[6].key, cells });
    cursor = addDays(cursor, 7);
  }
  return rows;
}

/** Buckets dated items into the grid's weeks, keeping the rows' order. Items outside the grid are dropped. */
export function groupByWeek<T>(
  items: T[],
  keyOf: (item: T) => string | null,
  rows: MonthRow[]
): Array<MonthRow & { items: T[] }> {
  return rows.map((row) => ({
    ...row,
    items: items.filter((item) => {
      const k = keyOf(item);
      return k !== null && k >= row.start && k <= row.end;
    }),
  }));
}

/** Days of the month that have happened so far (through today), or the whole month if it is past. */
export function daysElapsed(monthKey: string, todayKey: string): number {
  const first = parseMonthKey(monthKey);
  if (!first) return 0;
  const total = endOfMonth(first).getDate();
  const todayMonth = todayKey.slice(0, 7);
  if (todayMonth < monthKey) return 0;
  if (todayMonth > monthKey) return total;
  return Number(todayKey.slice(8, 10));
}
