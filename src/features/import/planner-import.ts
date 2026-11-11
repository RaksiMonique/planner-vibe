import 'server-only';
import { and, eq, like } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { legacyMap, lifeSegments, userPreferences } from '@/db/schema';
import { plannerTables, type TableEntry } from '@/features/export/tables';
import { chunks, prepareRow, type PreparedRow } from './prepare';

/**
 * Imports the planner's own JSON export (GET /api/export/json) into this
 * account, for moving data between projects (instructions.md 9.3). Every row
 * gets a new id; references are remapped through the ids imported so far, and
 * a mapping in `legacy_map` (entity type `planner:<table>`) makes a second run
 * skip everything it already created.
 */

const SKIP = new Set(['userPreferences', 'legacyMap', 'legacyImportFiles', 'notifications']);
const CHUNK = 100;

export type PlannerImportSummary = {
  format: string;
  tables: Array<{ key: string; inserted: number; skipped: number }>;
  warnings: string[];
};

export function parsePlannerExport(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('That file is not a planner export.');
  }
  const data = input as Record<string, unknown>;
  if (typeof data.format !== 'string' || !data.format.startsWith('planner-')) {
    throw new Error('That file is not a planner export (no format marker).');
  }
  return data;
}

type Pending = { prepared: PreparedRow; oldId: string };

export async function importPlannerExport(
  userId: string,
  input: unknown
): Promise<PlannerImportSummary> {
  const data = parsePlannerExport(input);
  const warnings: string[] = [];
  const tables: PlannerImportSummary['tables'] = [];
  const idMap = new Map<string, string>();
  const newMappings: Array<{
    userId: string;
    entityType: string;
    legacyKey: string;
    newId: string;
  }> = [];
  const remember = (key: string, oldId: string, newId: string) => {
    idMap.set(oldId, newId);
    newMappings.push({ userId, entityType: `planner:${key}`, legacyKey: oldId, newId });
  };

  await db.transaction(async (tx) => {
    const known = await tx
      .select({ key: legacyMap.legacyKey, newId: legacyMap.newId })
      .from(legacyMap)
      .where(and(eq(legacyMap.userId, userId), like(legacyMap.entityType, 'planner:%')));
    for (const m of known) idMap.set(m.key, m.newId);

    const segments = await tx
      .select({ id: lifeSegments.id, slug: lifeSegments.slug })
      .from(lifeSegments)
      .where(eq(lifeSegments.userId, userId));
    const segmentBySlug = new Map(segments.map((s) => [s.slug, s.id]));

    const prefs = Array.isArray(data.userPreferences) ? data.userPreferences[0] : null;
    if (prefs && typeof prefs === 'object') {
      const p = prefs as Record<string, unknown>;
      const set: Record<string, unknown> = {};
      if (typeof p.timeZone === 'string') set.timeZone = p.timeZone;
      if (typeof p.weekStartsOn === 'number') set.weekStartsOn = p.weekStartsOn;
      if (typeof p.currency === 'string') set.currency = p.currency;
      if (p.enabledModules && typeof p.enabledModules === 'object')
        set.enabledModules = p.enabledModules;
      if (Object.keys(set).length) {
        await tx
          .update(userPreferences)
          .set(set as never)
          .where(eq(userPreferences.userId, userId));
        tables.push({ key: 'userPreferences', inserted: 0, skipped: 0 });
      }
    }

    for (const entry of plannerTables()) {
      if (SKIP.has(entry.key) || !entry.id) continue;
      const rows = Array.isArray(data[entry.key])
        ? (data[entry.key] as Record<string, unknown>[])
        : [];
      if (rows.length === 0) continue;
      let inserted = 0;
      let skipped = 0;
      const pending: Pending[] = [];

      for (const row of rows) {
        const oldId = typeof row.id === 'string' ? row.id : null;
        if (!oldId || idMap.has(oldId)) {
          skipped++;
          continue;
        }
        if (entry.key === 'lifeSegments' && typeof row.slug === 'string') {
          const existing = segmentBySlug.get(row.slug);
          if (existing) {
            remember(entry.key, oldId, existing);
            skipped++;
            continue;
          }
        }
        const prepared = prepareRow(entry, row, userId, idMap);
        if (!prepared.ok) {
          skipped++;
          warnings.push(`${entry.key}: ${prepared.reason}`);
          continue;
        }
        pending.push({ prepared: prepared.row, oldId });
      }

      for (const chunk of chunks(pending, CHUNK)) {
        const ids = await insertChunk(tx, entry, chunk);
        if (ids) {
          chunk.forEach((c, i) => remember(entry.key, c.oldId, ids[i]));
          inserted += chunk.length;
          continue;
        }
        // A unique constraint tripped somewhere in the chunk: retry one row at a time.
        for (const c of chunk) {
          const single = await insertChunk(tx, entry, [c]);
          if (single) {
            remember(entry.key, c.oldId, single[0]);
            inserted++;
          } else {
            skipped++;
          }
        }
        if (inserted < pending.length) {
          warnings.push(`${entry.key}: some rows already existed and were skipped.`);
        }
      }

      const selfRefs = entry.foreignKeys.filter((f) => f.self);
      if (selfRefs.length > 0) {
        for (const c of pending) {
          const newId = idMap.get(c.oldId);
          if (!newId) continue;
          const set: Record<string, unknown> = {};
          for (const fk of selfRefs) {
            const parent = c.prepared.deferred[fk.column];
            const mapped = parent ? idMap.get(parent) : undefined;
            if (mapped) set[fk.column] = mapped;
          }
          if (Object.keys(set).length > 0) {
            await tx
              .update(entry.table)
              .set(set as never)
              .where(eq(entry.id as PgColumn, newId));
          }
        }
      }
      tables.push({ key: entry.key, inserted, skipped });
    }

    for (const chunk of chunks(newMappings, 200)) {
      await tx.insert(legacyMap).values(chunk).onConflictDoNothing();
    }
  });

  return { format: String(data.format), tables, warnings };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Inserts a chunk inside a savepoint; null when the database refused it. */
async function insertChunk(tx: Tx, entry: TableEntry, chunk: Pending[]): Promise<string[] | null> {
  try {
    return await tx.transaction(async (sp) => {
      const rows = await sp
        .insert(entry.table)
        .values(chunk.map((c) => c.prepared.values) as never)
        .returning({ id: entry.id as PgColumn });
      if (rows.length !== chunk.length) throw new Error('row count mismatch');
      return rows.map((r) => String(r.id));
    });
  } catch {
    return null;
  }
}
