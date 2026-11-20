import { addDays, format, parseISO } from 'date-fns';
import { toDateKey, weekRange, type WeekStartsOn } from '@/lib/dates';

/**
 * Pure helpers for the "This week in numbers" dashboard card. Everything works
 * on yyyy-MM-dd keys already resolved in the user's time zone.
 */

export type WeekKeys = { start: string; end: string };

/** The week holding `todayKey` and the week before it, as inclusive date keys. */
export function weekKeys(
  todayKey: string,
  weekStartsOn: WeekStartsOn
): { current: WeekKeys; previous: WeekKeys } {
  const { start, end } = weekRange(parseISO(todayKey), weekStartsOn);
  return {
    current: { start: toDateKey(start), end: toDateKey(end) },
    previous: { start: toDateKey(addDays(start, -7)), end: toDateKey(addDays(end, -7)) },
  };
}

/** "16 to 22 Nov", or "30 Nov to 6 Dec" when the week straddles a month. */
export function weekLabel(week: WeekKeys): string {
  const start = parseISO(week.start);
  const end = parseISO(week.end);
  const sameMonth = format(start, 'yyyy-MM') === format(end, 'yyyy-MM');
  return `${format(start, sameMonth ? 'd' : 'd MMM')} to ${format(end, 'd MMM')}`;
}

/** Minutes as hours with at most one decimal, for a stat tile: 90 → "1.5", 60 → "1". */
export function formatHours(minutes: number): string {
  const hours = Math.round((Math.max(0, minutes) / 60) * 10) / 10;
  return String(hours || 0);
}

/** The change against last week in one short phrase. */
export function deltaLabel(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return 'same as last week';
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff)} vs last week`;
}
