import { boolean, index, text, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps, searchColumn } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';

export const noteKindEnum = planner.enum('note_kind', ['note', 'quote']);

/** Notes and quotes (instructions.md 5.1, Resources). Important information is its own table in Release 4. */
export const notes = planner.table(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    kind: noteKindEnum('kind').notNull().default('note'),
    title: text('title'),
    content: text('content').notNull(),
    /** Quotes: who said it and where it comes from. */
    author: text('author'),
    source: text('source'),
    isPinned: boolean('is_pinned').notNull().default(false),
    ...softDelete(),
    search: searchColumn(['title', 'content', 'author', 'source']),
    ...timestamps(),
  },
  (t) => [
    index('notes_search_idx').using('gin', t.search),
    index('notes_user_kind_idx').on(t.userId, t.kind, t.updatedAt),
    ...ownerPolicies('notes'),
  ]
);

export type Note = typeof notes.$inferSelect;
