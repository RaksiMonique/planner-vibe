import { boolean, index, text, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps, searchColumn } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { mediaItems } from './media';
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
    /** The book, film or other item it came from, when it is in the media tracker. */
    mediaItemId: uuid('media_item_id').references(() => mediaItems.id, { onDelete: 'set null' }),
    /** Why it matters to the user: the line that gives a saved note its meaning later. */
    why: text('why'),
    /** Specific topics, lower-case; one note sits under many. */
    tags: text('tags').array().notNull().default([]),
    isPinned: boolean('is_pinned').notNull().default(false),
    ...softDelete(),
    search: searchColumn(['title', 'content', 'author', 'source']),
    ...timestamps(),
  },
  (t) => [
    index('notes_search_idx').using('gin', t.search),
    index('notes_user_kind_idx').on(t.userId, t.kind, t.updatedAt),
    index('notes_tags_idx').using('gin', t.tags),
    index('notes_media_item_idx').on(t.mediaItemId),
    ...ownerPolicies('notes'),
  ]
);

export type Note = typeof notes.$inferSelect;
