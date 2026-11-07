import { date, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { ownerId } from './profiles';

export const captureKindEnum = planner.enum('capture_kind', ['task', 'note', 'event']);

/**
 * The Inbox (instructions.md 7.6). A capture needs no Life Segment; it becomes
 * a task, note or event when one is chosen. A capture pinned to a date is a
 * sticky note on the time-blocking view.
 */
export const captures = planner.table(
  'captures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    text: text('text').notNull(),
    kind: captureKindEnum('kind'),
    pinnedDate: date('pinned_date'),
    convertedEntityType: text('converted_entity_type'),
    convertedEntityId: uuid('converted_entity_id'),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('captures_user_open_idx').on(t.userId, t.convertedAt),
    index('captures_user_pinned_idx').on(t.userId, t.pinnedDate),
    ...ownerPolicies('captures'),
  ]
);

export type Capture = typeof captures.$inferSelect;
export type NewCapture = typeof captures.$inferInsert;
