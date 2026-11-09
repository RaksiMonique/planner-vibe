import { index, integer, text, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { goals, projects } from './planning';
import { ownerId } from './profiles';

export const visionItemKindEnum = planner.enum('vision_item_kind', ['image', 'quote', 'link']);

/** Images live in the private `planner` storage bucket under `<userId>/vision/…`; only the object path is stored. */
export const visionBoards = planner.table(
  'vision_boards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    coverPath: text('cover_path'),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('vision_boards_user_idx').on(t.userId, t.sortOrder),
    ...ownerPolicies('vision_boards'),
  ]
);

export const visionBoardItems = planner.table(
  'vision_board_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    boardId: uuid('board_id')
      .notNull()
      .references(() => visionBoards.id, { onDelete: 'cascade' }),
    kind: visionItemKindEnum('kind').notNull().default('image'),
    imagePath: text('image_path'),
    url: text('url'),
    caption: text('caption'),
    quoteText: text('quote_text'),
    author: text('author'),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index('vision_board_items_board_idx').on(t.boardId, t.sortOrder),
    ...ownerPolicies('vision_board_items'),
  ]
);

export type VisionBoard = typeof visionBoards.$inferSelect;
export type VisionBoardItem = typeof visionBoardItems.$inferSelect;
