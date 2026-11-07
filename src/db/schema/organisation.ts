import { boolean, index, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { ownerId } from './profiles';

/** Palette accents a segment, calendar or habit may use (instructions.md 2.1). */
export const accentEnum = planner.enum('accent', [
  'burgundy',
  'terracotta',
  'coral',
  'peach',
  'sage',
  'beige',
]);
export type Accent = (typeof accentEnum.enumValues)[number];

export const entityTypeEnum = planner.enum('entity_type', [
  'goal',
  'project',
  'task',
  'event',
  'habit',
  'routine',
  'time_block',
  'capture',
]);

export const lifeSegments = planner.table(
  'life_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    accent: accentEnum('accent').notNull().default('burgundy'),
    // lucide icon name
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    // Analytics weight so segments are not treated as equally important (5.3).
    weight: integer('weight').notNull().default(1),
    isDefault: boolean('is_default').notNull().default(false),
    // Archiving hides a segment; deleting one requires moving its records first.
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('life_segments_user_slug_idx').on(t.userId, t.slug),
    index('life_segments_user_sort_idx').on(t.userId, t.sortOrder),
    ...ownerPolicies('life_segments'),
  ]
);

export const tags = planner.table(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    ...timestamps(),
  },
  (t) => [uniqueIndex('tags_user_name_idx').on(t.userId, t.name), ...ownerPolicies('tags')]
);

export const tagAssignments = planner.table(
  'tag_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('tag_assignments_tag_entity_idx').on(t.tagId, t.entityType, t.entityId),
    index('tag_assignments_entity_idx').on(t.userId, t.entityType, t.entityId),
    ...ownerPolicies('tag_assignments'),
  ]
);

export type LifeSegment = typeof lifeSegments.$inferSelect;
export type NewLifeSegment = typeof lifeSegments.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type TagAssignment = typeof tagAssignments.$inferSelect;
export type NewTagAssignment = typeof tagAssignments.$inferInsert;
