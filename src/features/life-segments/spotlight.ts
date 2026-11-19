import { getDayOfYear, parseISO } from 'date-fns';

/**
 * Which of `count` segments the dashboard spotlights on `todayKey`: the day of
 * the year modulo the count, so the pick is stable for the day and every
 * segment gets its turn. Returns -1 when there is nothing to pick from.
 */
export function spotlightIndex(todayKey: string, count: number): number {
  if (count <= 0) return -1;
  const day = getDayOfYear(parseISO(todayKey));
  if (Number.isNaN(day)) return 0;
  return (day - 1) % count;
}
