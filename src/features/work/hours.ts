import type { PatternDay } from '@/db/schema/work';
import type { WorkDay, WorkShift } from './availability';

/**
 * Hours are derived from shift times, never stored. Only shifts of kind
 * `work` count; on-call days are availability, not hours worked.
 */

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Hours between two 'HH:MM' times; an end at or before the start rolls past midnight. 0 without both. */
export function shiftHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  let span = minutesOf(end) - minutesOf(start);
  if (span <= 0) span += 24 * 60;
  return span / 60;
}

export type WeekHours = {
  /** Hours of timed work shifts on days up to and including today. */
  worked: number;
  /** Hours of timed work shifts on later days of the range. */
  planned: number;
  /** Work shifts in the range that have no times, so count for nothing. */
  untimed: number;
  /** Work shifts in the range, timed or not. */
  shifts: number;
};

export function summariseWeekHours(days: WorkDay[], todayKey: string): WeekHours {
  const totals: WeekHours = { worked: 0, planned: 0, untimed: 0, shifts: 0 };
  for (const day of days) {
    for (const shift of day.shifts) {
      if (shift.kind !== 'work') continue;
      totals.shifts += 1;
      const hours = shiftHours(shift.start, shift.end);
      if (hours === 0) totals.untimed += 1;
      else if (day.date <= todayKey) totals.worked += hours;
      else totals.planned += hours;
    }
  }
  return totals;
}

/**
 * The hours a week of the active patterns adds up to: each cycle's work
 * hours spread over its length, times seven. Null when there is no active
 * pattern or a work day in one lacks times, since the figure would mislead.
 */
export function expectedWeeklyHours(
  patterns: Array<{ cycle: PatternDay[]; isActive: boolean }>
): number | null {
  const active = patterns.filter((p) => p.isActive && p.cycle.length > 0);
  if (active.length === 0) return null;
  let total = 0;
  for (const pattern of active) {
    let hours = 0;
    for (const day of pattern.cycle) {
      if (day.kind !== 'work') continue;
      const h = shiftHours(day.start, day.end);
      if (h === 0) return null;
      hours += h;
    }
    total += (hours / pattern.cycle.length) * 7;
  }
  return Math.round(total * 10) / 10;
}

/**
 * The first work or on-call shift still to come: today's if it has not
 * ended by `nowTime` ('HH:MM'; an overnight or untimed shift counts), else
 * the first on a later day.
 */
export function nextShift(
  days: WorkDay[],
  todayKey: string,
  nowTime: string
): { date: string; shift: WorkShift } | null {
  for (const day of days) {
    if (day.date < todayKey) continue;
    for (const shift of day.shifts) {
      if (shift.kind === 'off') continue;
      if (day.date === todayKey) {
        const overnight = shift.start && shift.end && shift.end <= shift.start;
        const ended = shift.end && !overnight && shift.end <= nowTime;
        if (ended) continue;
      }
      return { date: day.date, shift };
    }
  }
  return null;
}

/** "7.5" or "38": whole hours without a decimal. */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
