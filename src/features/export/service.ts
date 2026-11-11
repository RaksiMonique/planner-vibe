import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { EXCLUDED_FROM_EXPORT, plannerTables } from './tables';

/** Every planner table's rows for one user, keyed by table name. */
export type ExportOptions = {
  /** Mood, wellness, products and important records are private by default (instructions.md 8.19, 8.23). */
  includeSensitive?: boolean;
};

export async function exportPlannerData(userId: string, options: ExportOptions = {}) {
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, userId));
  const entries = plannerTables().filter(
    (t) => !EXCLUDED_FROM_EXPORT.has(t.key) && (options.includeSensitive || !t.sensitive)
  );
  const rows = await Promise.all(
    entries.map((t) => db.select().from(t.table).where(eq(t.userId, userId)))
  );
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    // v2: every user-owned table, discovered from the schema (src/features/export/tables.ts).
    format: 'planner-v2',
    profile: profile ?? null,
  };
  entries.forEach((t, i) => {
    data[t.key] = rows[i];
  });
  return data;
}
