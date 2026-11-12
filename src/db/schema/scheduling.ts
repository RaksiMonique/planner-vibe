import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { recurrence, softDelete, timestamps, searchColumn } from './_columns';
import { ownerPolicies } from './_policies';
import { accentEnum, lifeSegments } from './organisation';
import { projects, tasks } from './planning';
import { ownerId } from './profiles';

export const calendarKindEnum = planner.enum('calendar_kind', ['personal', 'work', 'other']);
export const activityTypeEnum = planner.enum('activity_type', [
  'deep_work',
  'light_work',
  'break',
  'custom',
]);
export const templateKindEnum = planner.enum('template_kind', ['day', 'week']);

/** A calendar is a filterable container; the work calendar feeds the Life Calendar when enabled. */
export const calendars = planner.table(
  'calendars',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    kind: calendarKindEnum('kind').notNull().default('personal'),
    accent: accentEnum('accent').notNull().default('burgundy'),
    isEnabled: boolean('is_enabled').notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('calendars_user_name_idx').on(t.userId, t.name),
    ...ownerPolicies('calendars'),
  ]
);

export const events = planner.table(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    calendarId: uuid('calendar_id')
      .notNull()
      .references(() => calendars.id, { onDelete: 'restrict' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    location: text('location'),
    /** A built-in key (general, appointment, self_care, work, other) or the user's own label. */
    category: text('category').notNull().default('general'),
    // Timed events use starts_at/ends_at; all-day events use all_day_date (5.4).
    isAllDay: boolean('is_all_day').notNull().default(false),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    allDayDate: date('all_day_date'),
    /** Id of this event in a connected external calendar, once pushed there. */
    externalId: text('external_id'),
    externalSyncedAt: timestamp('external_synced_at', { withTimezone: true }),
    ...recurrence(),
    recurrenceParentId: uuid('recurrence_parent_id').references((): AnyPgColumn => events.id, {
      onDelete: 'cascade',
    }),
    ...softDelete(),
    search: searchColumn(['title', 'description', 'location']),
    ...timestamps(),
  },
  (t) => [
    index('events_search_idx').using('gin', t.search),
    index('events_user_starts_idx').on(t.userId, t.startsAt),
    index('events_user_all_day_idx').on(t.userId, t.allDayDate),
    index('events_calendar_idx').on(t.calendarId),
    ...ownerPolicies('events'),
  ]
);

/** Planned time. Actual time is a `time_entries` row (5.4). */
export const timeBlocks = planner.table(
  'time_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    activityType: activityTypeEnum('activity_type').notNull().default('custom'),
    title: text('title').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    ...recurrence(),
    recurrenceParentId: uuid('recurrence_parent_id').references((): AnyPgColumn => timeBlocks.id, {
      onDelete: 'cascade',
    }),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('time_blocks_user_starts_idx').on(t.userId, t.startsAt),
    index('time_blocks_task_idx').on(t.taskId),
    ...ownerPolicies('time_blocks'),
  ]
);

export type TemplateBlock = {
  /** 0 = Sunday … 6 = Saturday; omitted for day templates */
  dayOfWeek?: number;
  /** "HH:mm" local time */
  start: string;
  end: string;
  activityType: (typeof activityTypeEnum.enumValues)[number];
  title: string;
};

/** A reusable day or week of blocks (instructions.md 5.5). */
export const timeBlockTemplates = planner.table(
  'time_block_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    kind: templateKindEnum('kind').notNull().default('day'),
    blocks: jsonb('blocks').$type<TemplateBlock[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('time_block_templates_user_name_idx').on(t.userId, t.name),
    ...ownerPolicies('time_block_templates'),
  ]
);

export type Calendar = typeof calendars.$inferSelect;
export type NewCalendar = typeof calendars.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type TimeBlock = typeof timeBlocks.$inferSelect;
export type NewTimeBlock = typeof timeBlocks.$inferInsert;
export type TimeBlockTemplate = typeof timeBlockTemplates.$inferSelect;
export type NewTimeBlockTemplate = typeof timeBlockTemplates.$inferInsert;
