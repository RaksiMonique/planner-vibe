import { index, jsonb, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { ownerId } from './profiles';

/**
 * The raw JSON export of the old vanilla JS app, kept so later releases can
 * import the sections Release 1 skips (Bible studies, studies, recipes, meal
 * plan, journal, quotes) without asking for the file again.
 */
export const legacyImportFiles = planner.table(
  'legacy_import_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    fileName: text('file_name'),
    raw: jsonb('raw').$type<unknown>().notNull(),
    /** Counts per section: imported, skipped, deferred. */
    summary: jsonb('summary').$type<Record<string, unknown>>(),
    importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('legacy_import_files_user_idx').on(t.userId, t.importedAt),
    ...ownerPolicies('legacy_import_files'),
  ]
);

/** Maps a legacy record (by section and legacy id or key) to the row it became, so re-imports skip it. */
export const legacyMap = planner.table(
  'legacy_map',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    entityType: text('entity_type').notNull(),
    legacyKey: text('legacy_key').notNull(),
    newId: uuid('new_id').notNull(),
  },
  (t) => [
    uniqueIndex('legacy_map_user_entity_key_idx').on(t.userId, t.entityType, t.legacyKey),
    ...ownerPolicies('legacy_map'),
  ]
);

export type LegacyImportFile = typeof legacyImportFiles.$inferSelect;
export type LegacyMapRow = typeof legacyMap.$inferSelect;
