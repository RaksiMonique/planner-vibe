import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * When something was finished, relative to the user's today: "today",
 * "yesterday", the weekday inside the last week, otherwise "3 Nov".
 */
export function completedWording(completedAt: Date, todayKey: string, timeZone: string): string {
  const key = formatInTimeZone(completedAt, timeZone, 'yyyy-MM-dd');
  const days = differenceInCalendarDays(parseISO(todayKey), parseISO(key));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return format(parseISO(key), 'EEEE');
  return format(parseISO(key), 'd MMM');
}
