import {
  boolean,
  date,
  index,
  integer,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';

export const mediaKindEnum = planner.enum('media_kind', [
  'book',
  'movie',
  'series',
  'song',
  'other',
]);
export const mediaStatusEnum = planner.enum('media_status', [
  'wishlist',
  'in_progress',
  'done',
  'abandoned',
]);

/** A library record: a book, film, series or song. Segment optional (instructions.md 5.3). */
export const mediaItems = planner.table(
  'media_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id').references(() => lifeSegments.id, {
      onDelete: 'set null',
    }),
    kind: mediaKindEnum('kind').notNull().default('book'),
    title: text('title').notNull(),
    /** Author, director or artist. */
    creator: text('creator'),
    coverUrl: text('cover_url'),
    category: text('category'),
    status: mediaStatusEnum('status').notNull().default('wishlist'),
    rating: smallint('rating'),
    review: text('review'),
    notes: text('notes'),
    isFavourite: boolean('is_favourite').notNull().default(false),
    startedOn: date('started_on'),
    finishedOn: date('finished_on'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('media_items_user_kind_status_idx').on(t.userId, t.kind, t.status),
    ...ownerPolicies('media_items'),
  ]
);

/** Activity on an item: pages read, an episode watched. Always belongs to a segment. */
export const mediaLogs = planner.table(
  'media_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    mediaItemId: uuid('media_item_id')
      .notNull()
      .references(() => mediaItems.id, { onDelete: 'cascade' }),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    date: date('date').notNull(),
    /** Free-form position such as "p. 120" or "S2E3". */
    progress: text('progress'),
    minutes: integer('minutes'),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [index('media_logs_user_date_idx').on(t.userId, t.date), ...ownerPolicies('media_logs')]
);

export const mediaLists = planner.table(
  'media_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    kind: mediaKindEnum('kind'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('media_lists_user_name_idx').on(t.userId, t.name),
    ...ownerPolicies('media_lists'),
  ]
);

export const mediaListItems = planner.table(
  'media_list_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    listId: uuid('list_id')
      .notNull()
      .references(() => mediaLists.id, { onDelete: 'cascade' }),
    mediaItemId: uuid('media_item_id')
      .notNull()
      .references(() => mediaItems.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('media_list_items_list_item_idx').on(t.listId, t.mediaItemId),
    ...ownerPolicies('media_list_items'),
  ]
);

export type MediaItem = typeof mediaItems.$inferSelect;
export type MediaLog = typeof mediaLogs.$inferSelect;
export type MediaList = typeof mediaLists.$inferSelect;
export type MediaListItem = typeof mediaListItems.$inferSelect;
