import { getDayOfYear, parseISO } from 'date-fns';

type Pickable = { id: string; isFavourite: boolean; isBookmark: boolean };

/**
 * The saved passage to show for a day: favourites when there are any,
 * otherwise bookmarks, chosen by day of year so the same day always gives the
 * same passage whatever order the rows arrive in. Null when nothing is saved.
 */
export function pickScriptureOfDay<T extends Pickable>(
  references: T[],
  todayKey: string
): T | null {
  const favourites = references.filter((r) => r.isFavourite);
  const pool = favourites.length > 0 ? favourites : references.filter((r) => r.isBookmark);
  if (pool.length === 0) return null;
  const ordered = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const day = getDayOfYear(parseISO(todayKey));
  return ordered[(day - 1) % ordered.length];
}
