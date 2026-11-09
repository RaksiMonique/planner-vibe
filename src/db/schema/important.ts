import { boolean, index, jsonb, text, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { ownerId } from './profiles';

export const importantKindEnum = planner.enum('important_kind', [
  'emergency_contact',
  'important_date',
  'insurance',
  'medical_contact',
  'household',
  'document_reference',
  'emergency_instruction',
]);

/**
 * Structured private records (instructions.md 8.23). Never passwords or
 * credentials: the UI links to a password manager instead. Excluded from
 * exports and sharing unless explicitly included.
 */
export const importantRecords = planner.table(
  'important_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    kind: importantKindEnum('kind').notNull(),
    title: text('title').notNull(),
    /** Kind-specific fields such as phone, policy number, date, location. */
    fields: jsonb('fields').$type<Record<string, string>>().notNull().default({}),
    notes: text('notes'),
    isSensitive: boolean('is_sensitive').notNull().default(true),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('important_records_user_kind_idx').on(t.userId, t.kind),
    ...ownerPolicies('important_records'),
  ]
);

export type ImportantRecord = typeof importantRecords.$inferSelect;
