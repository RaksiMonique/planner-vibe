/**
 * The Someday card (dashboard): one undated, still-planned goal or project a
 * week, asked about plainly. The pick is a hash of the week's key, so it stays
 * the same all week and changes with the next, without storing anything.
 */

/** A small, stable string hash (djb2), non-negative. */
export function hashString(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function pickSomeday<T>(items: readonly T[], weekKey: string): T | null {
  if (items.length === 0) return null;
  return items[hashString(weekKey) % items.length] ?? null;
}
