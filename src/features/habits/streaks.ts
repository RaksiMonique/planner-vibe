/**
 * Pure habit maths (instructions.md 8.2). Everything works on yyyy-MM-dd
 * keys so it is independent of time zones: callers pass "today" already
 * resolved in the user's zone.
 */
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { WeekStartsOn } from '@/lib/dates';
import type { HabitFrequency } from './schema';

export type StreakInput = {
  /** One entry per check-in; a value above 1 counts as that many. */
  checkIns: Array<{ date: string; value?: number }>;
  frequency: HabitFrequency;
  target: number;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
};

export type PeriodSummary = {
  startKey: string;
  endKey: string;
  count: number;
  target: number;
  met: boolean;
  remaining: number;
};

const key = (d: Date) => format(d, 'yyyy-MM-dd');

export function periodStart(date: Date, frequency: HabitFrequency, weekStartsOn: WeekStartsOn) {
  if (frequency === 'weekly') return startOfWeek(date, { weekStartsOn });
  if (frequency === 'monthly') return startOfMonth(date);
  return parseISO(key(date));
}

export function periodEnd(start: Date, frequency: HabitFrequency): Date {
  if (frequency === 'weekly') return addDays(start, 6);
  if (frequency === 'monthly') return endOfMonth(start);
  return start;
}

function previousPeriod(start: Date, frequency: HabitFrequency): Date {
  if (frequency === 'weekly') return subWeeks(start, 1);
  if (frequency === 'monthly') return subMonths(start, 1);
  return subDays(start, 1);
}

function nextPeriod(start: Date, frequency: HabitFrequency): Date {
  if (frequency === 'weekly') return addWeeks(start, 1);
  if (frequency === 'monthly') return addMonths(start, 1);
  return addDays(start, 1);
}

/** Check-in totals keyed by the start date of their period. */
export function countByPeriod(input: StreakInput): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of input.checkIns) {
    const k = key(periodStart(parseISO(c.date), input.frequency, input.weekStartsOn));
    counts.set(k, (counts.get(k) ?? 0) + (c.value ?? 1));
  }
  return counts;
}

export function periodSummary(input: StreakInput): PeriodSummary {
  const counts = countByPeriod(input);
  const start = periodStart(parseISO(input.todayKey), input.frequency, input.weekStartsOn);
  const count = counts.get(key(start)) ?? 0;
  return {
    startKey: key(start),
    endKey: key(periodEnd(start, input.frequency)),
    count,
    target: input.target,
    met: count >= input.target,
    remaining: Math.max(0, input.target - count),
  };
}

/**
 * Consecutive periods that met the target, ending in the current period or,
 * if the current one is still open and unmet, the previous period.
 */
export function currentStreak(input: StreakInput): number {
  const counts = countByPeriod(input);
  const met = (d: Date) => (counts.get(key(d)) ?? 0) >= input.target;
  let cursor = periodStart(parseISO(input.todayKey), input.frequency, input.weekStartsOn);
  if (!met(cursor)) cursor = previousPeriod(cursor, input.frequency);
  let streak = 0;
  while (met(cursor)) {
    streak++;
    cursor = previousPeriod(cursor, input.frequency);
  }
  return streak;
}

/** The longest run of consecutive met periods, up to today. */
export function longestStreak(input: StreakInput): number {
  if (input.checkIns.length === 0) return 0;
  const counts = countByPeriod(input);
  const earliest = input.checkIns.map((c) => c.date).sort()[0];
  const today = periodStart(parseISO(input.todayKey), input.frequency, input.weekStartsOn);
  let cursor = periodStart(parseISO(earliest), input.frequency, input.weekStartsOn);
  let best = 0;
  let run = 0;
  while (!isAfter(cursor, today)) {
    if ((counts.get(key(cursor)) ?? 0) >= input.target) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    cursor = nextPeriod(cursor, input.frequency);
  }
  return best;
}

/**
 * Percentage of the target achieved across the periods that touch the last
 * `days` days (default 30). Over-achieving a period does not compensate for
 * missing another.
 */
export function completionRate(input: StreakInput, days = 30): number {
  const counts = countByPeriod(input);
  const today = parseISO(input.todayKey);
  const todayPeriod = periodStart(today, input.frequency, input.weekStartsOn);
  let cursor = periodStart(subDays(today, days - 1), input.frequency, input.weekStartsOn);
  let achieved = 0;
  let possible = 0;
  while (!isAfter(cursor, todayPeriod)) {
    achieved += Math.min(counts.get(key(cursor)) ?? 0, input.target);
    possible += input.target;
    cursor = nextPeriod(cursor, input.frequency);
  }
  return possible === 0 ? 0 : Math.round((achieved / possible) * 100);
}

export function isFutureKey(dateKey: string, todayKey: string): boolean {
  return isBefore(parseISO(todayKey), parseISO(dateKey));
}
