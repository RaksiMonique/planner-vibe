type Dated = { dueDate: string | null };

/**
 * Splits open assignments for a preview: the ones due today or later first,
 * nearest first, then undated ones, with the overdue ones counted apart.
 * Rows are expected in due-date order, as listAssignments returns them.
 */
export function dueAssignments<T extends Dated>(
  rows: T[],
  todayKey: string,
  cap: number
): { shown: T[]; overdue: number; more: number } {
  const overdue = rows.filter((r) => r.dueDate !== null && r.dueDate < todayKey).length;
  const dated = rows.filter((r) => r.dueDate !== null && r.dueDate >= todayKey);
  const undated = rows.filter((r) => r.dueDate === null);
  const queue = [...dated, ...undated];
  const shown = queue.slice(0, cap);
  return { shown, overdue, more: queue.length - shown.length };
}
