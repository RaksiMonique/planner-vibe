import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isAfter,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DEFAULT_TIME_ZONE = 'America/Jamaica';
export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 1;

/** The calendar date "today" in the user's time zone, at local midnight. */
export function todayInZone(timeZone: string, now: Date = new Date()): Date {
  return startOfDay(toZonedTime(now, timeZone));
}

export function weekRange(date: Date, weekStartsOn: WeekStartsOn) {
  return {
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  };
}

export function weekDays(date: Date, weekStartsOn: WeekStartsOn): Date[] {
  const { start } = weekRange(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export type DueStatus = 'overdue' | 'today' | 'this_week' | 'later' | 'none';

/** Classifies a yyyy-MM-dd due date relative to the user's today. */
export function dueStatus(
  dueDate: string | null | undefined,
  today: Date,
  weekStartsOn: WeekStartsOn
): DueStatus {
  if (!dueDate) return 'none';
  const due = parseISO(dueDate);
  const diff = differenceInCalendarDays(due, today);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  const { end } = weekRange(today, weekStartsOn);
  return isAfter(due, end) ? 'later' : 'this_week';
}

export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatLongDate(date: Date): string {
  return format(date, 'EEEE, d MMMM yyyy');
}

/**
 * `key` moved by as many days as it took `previous` to reach `next`, so a
 * last day keeps its distance from a first day that moved. Empty stays empty.
 */
export function moveWith(key: string, previous: string, next: string): string {
  if (!key || !previous || !next) return key;
  const days = differenceInCalendarDays(parseISO(next), parseISO(previous));
  return toDateKey(addDays(parseISO(key), days));
}
