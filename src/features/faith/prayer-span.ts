import { differenceInCalendarDays, parseISO } from 'date-fns';

/**
 * How long an intention has been prayed for, from its date to today:
 * "since today", "3 days", "2 weeks", "4 months", "1 year".
 */
export function prayerSpan(dateKey: string, todayKey: string): string {
  const days = differenceInCalendarDays(parseISO(todayKey), parseISO(dateKey));
  if (days <= 0) return 'since today';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 61) return `${Math.floor(days / 7)} weeks`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year' : `${years} years`;
}
