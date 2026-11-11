import { getTableColumns, is } from 'drizzle-orm';
import { getTableConfig, PgTable, type PgColumn } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';

/**
 * Every planner table that belongs to a user, discovered from the Drizzle
 * schema so export and import never fall behind a new release. Reference
 * tables (bible_books) and profiles (owned by auth) have no user_id and are
 * left out.
 */

export type ForeignKeyRef = {
  /** JS property name on a row, e.g. `lifeSegmentId`. */
  column: string;
  /** Export key of the table it points at, e.g. `lifeSegments`. */
  targetKey: string;
  self: boolean;
  nullable: boolean;
};

export type TableEntry = {
  /** Export key: the schema export name, e.g. `tasks`. */
  key: string;
  /** SQL table name. */
  name: string;
  table: PgTable;
  columns: Record<string, PgColumn>;
  userId: PgColumn;
  id: PgColumn | null;
  foreignKeys: ForeignKeyRef[];
  sensitive: boolean;
};

/** Private by default (instructions.md 8.19, 8.23): exported only on request. */
export const SENSITIVE_TABLES = new Set([
  'moodEntries',
  'wellnessEntries',
  'products',
  'importantRecords',
]);

/** Raw uploads of the old app: large, and only useful to the import that stored them. */
export const EXCLUDED_FROM_EXPORT = new Set(['legacyImportFiles']);

let cache: TableEntry[] | null = null;

/** User-owned tables in an order where every foreign-key target comes first (self references aside). */
export function plannerTables(): TableEntry[] {
  if (cache) return cache;
  const entries: TableEntry[] = [];
  const keyByTable = new Map<PgTable, string>();
  for (const [key, value] of Object.entries(schema)) {
    if (!is(value, PgTable)) continue;
    const columns = getTableColumns(value) as Record<string, PgColumn>;
    const userId = columns.userId;
    if (!userId || userId.name !== 'user_id') continue;
    keyByTable.set(value, key);
    entries.push({
      key,
      name: getTableConfig(value).name,
      table: value,
      columns,
      userId,
      id: columns.id ?? null,
      foreignKeys: [],
      sensitive: SENSITIVE_TABLES.has(key),
    });
  }
  const jsName = (table: PgTable, sqlName: string) => {
    const columns = getTableColumns(table) as Record<string, PgColumn>;
    return Object.entries(columns).find(([, c]) => c.name === sqlName)?.[0] ?? sqlName;
  };
  for (const entry of entries) {
    for (const fk of getTableConfig(entry.table).foreignKeys) {
      const ref = fk.reference();
      const targetKey = keyByTable.get(ref.foreignTable as PgTable);
      if (!targetKey) continue; // points outside the user-owned set (profiles, bible_books)
      const column = jsName(entry.table, ref.columns[0].name);
      entry.foreignKeys.push({
        column,
        targetKey,
        self: targetKey === entry.key,
        nullable: !entry.columns[column]?.notNull,
      });
    }
  }
  cache = topologicalOrder(entries);
  return cache;
}

function topologicalOrder(entries: TableEntry[]): TableEntry[] {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const placed = new Set<string>();
  const out: TableEntry[] = [];
  const visit = (entry: TableEntry, trail: string[]) => {
    if (placed.has(entry.key)) return;
    if (trail.includes(entry.key)) {
      throw new Error(`Foreign keys form a cycle: ${[...trail, entry.key].join(' → ')}`);
    }
    for (const fk of entry.foreignKeys) {
      if (fk.self) continue;
      visit(byKey.get(fk.targetKey)!, [...trail, entry.key]);
    }
    placed.add(entry.key);
    out.push(entry);
  };
  for (const entry of entries) visit(entry, []);
  return out;
}

export function tableByKey(key: string): TableEntry | undefined {
  return plannerTables().find((t) => t.key === key);
}
