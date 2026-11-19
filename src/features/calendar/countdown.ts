import { differenceInCalendarDays, parseISO } from 'date-fns';

/** Whole days from `todayKey` to `dateKey`; negative when it has passed. */
export function daysUntil(todayKey: string, dateKey: string): number {
  return differenceInCalendarDays(parseISO(dateKey), parseISO(todayKey));
}

/** "today", "tomorrow", "in 12 days", or "3 days ago" for something that has passed. */
export function daysUntilWording(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days < 0) return `${-days} days ago`;
  return `in ${days} days`;
}
