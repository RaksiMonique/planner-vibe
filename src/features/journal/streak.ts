import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { toDateKey } from '@/lib/dates';

/** Pure streak arithmetic over 'yyyy-MM-dd' keys of days that have an entry. */

/** `n` keys ending on `todayKey`, oldest first. */
export function dayKeys(todayKey: string, n: number): string[] {
  const today = parseISO(todayKey);
  return Array.from({ length: n }, (_, i) => toDateKey(addDays(today, i - (n - 1))));
}

/**
 * Days in a row with an entry, ending today or, when today is still blank,
 * yesterday; 0 once a day has been missed.
 */
export function currentStreak(written: Iterable<string>, todayKey: string): number {
  const days = new Set(written);
  let cursor = parseISO(todayKey);
  if (!days.has(todayKey)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive days among `written`. */
export function longestStreak(written: Iterable<string>): number {
  const sorted = [...new Set(written)].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    const gap =
      i === 0 ? null : differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return longest;
}
