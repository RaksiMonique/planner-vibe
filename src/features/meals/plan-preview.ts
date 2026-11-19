/** Pure helper for the Meals dashboard card: which day of the plan to preview. */

import { MEAL_SLOTS, type MealSlot } from './schema';

export type PlannedEntry = { date: string; slot: MealSlot; sortOrder: number };

export type PlannedDay<T extends PlannedEntry> = {
  dateKey: string;
  isToday: boolean;
  entries: T[];
};

const slotRank = (slot: MealSlot) => MEAL_SLOTS.indexOf(slot);

/** Entries for one day in slot order (breakfast first), then by their own order. */
export function entriesForDay<T extends PlannedEntry>(entries: T[], dateKey: string): T[] {
  return entries
    .filter((e) => e.date === dateKey)
    .sort((a, b) => slotRank(a.slot) - slotRank(b.slot) || a.sortOrder - b.sortOrder);
}

/**
 * Today's meals when any are planned; otherwise the next planned day after
 * today within the given entries; null when nothing lies ahead.
 */
export function pickPlannedDay<T extends PlannedEntry>(
  entries: T[],
  todayKey: string
): PlannedDay<T> | null {
  const today = entriesForDay(entries, todayKey);
  if (today.length > 0) return { dateKey: todayKey, isToday: true, entries: today };
  const ahead = [...new Set(entries.map((e) => e.date))].filter((d) => d > todayKey).sort();
  const next = ahead[0];
  if (!next) return null;
  return { dateKey: next, isToday: false, entries: entriesForDay(entries, next) };
}
