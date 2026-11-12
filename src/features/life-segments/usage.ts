/**
 * Orders rows by how often they are used, most used first. Ties keep their
 * incoming order, so a manual sort order still decides between unused rows.
 */
export function orderByUsage<T extends { id: string }>(
  rows: readonly T[],
  counts: ReadonlyMap<string, number>
): T[] {
  return [...rows].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
}
