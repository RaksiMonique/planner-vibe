import type { TableEntry } from '@/features/export/tables';

/**
 * Turns one row of a planner export into insert values for this user: drops
 * the old id, remaps foreign keys through the ids already imported, defers
 * self references to a second pass, and revives timestamps. Pure, so it can
 * be tested without a database.
 */

export type PreparedRow = {
  values: Record<string, unknown>;
  /** Self-referencing columns: old parent id, applied once the parent exists. */
  deferred: Record<string, string>;
};

export type PrepareResult = { ok: true; row: PreparedRow } | { ok: false; reason: string };

export function prepareRow(
  entry: TableEntry,
  row: Record<string, unknown>,
  userId: string,
  idMap: Map<string, string>
): PrepareResult {
  const values: Record<string, unknown> = {};
  const deferred: Record<string, string> = {};
  for (const [jsKey, column] of Object.entries(entry.columns)) {
    if (jsKey === 'id') continue;
    if (jsKey === 'userId') {
      values.userId = userId;
      continue;
    }
    if (!(jsKey in row)) continue;
    let value = row[jsKey];
    const fk = entry.foreignKeys.find((f) => f.column === jsKey);
    if (fk) {
      if (value === null || value === undefined) {
        values[jsKey] = null;
        continue;
      }
      if (typeof value !== 'string') return { ok: false, reason: `${jsKey} is not an id` };
      if (fk.self) {
        deferred[jsKey] = value;
        values[jsKey] = null;
        continue;
      }
      const mapped = idMap.get(value);
      if (!mapped) {
        if (fk.nullable) {
          values[jsKey] = null;
          continue;
        }
        return {
          ok: false,
          reason: `${jsKey} points at a ${fk.targetKey} row that was not imported`,
        };
      }
      values[jsKey] = mapped;
      continue;
    }
    if (column.columnType === 'PgTimestamp' && typeof value === 'string') value = new Date(value);
    // Polymorphic references (reminders.entity_id) carry no foreign key but still need remapping.
    if (jsKey.endsWith('Id') && typeof value === 'string' && idMap.has(value))
      value = idMap.get(value);
    values[jsKey] = value;
  }
  return { ok: true, row: { values, deferred } };
}

export function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
