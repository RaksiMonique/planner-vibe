import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { accentEnum, lifeSegments } from './organisation';
import { projects, tasks } from './planning';
import { ownerId } from './profiles';
import { timeBlocks } from './scheduling';

export const habitFrequencyEnum = planner.enum('habit_frequency', ['daily', 'weekly', 'monthly']);
export const routineKindEnum = planner.enum('routine_kind', [
  'morning',
  'evening',
  'custom',
  'skincare',
  'haircare',
]);

/** A habit describes what should happen; a check-in records what happened (5.4). */
export const habits = planner.table(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    frequency: habitFrequencyEnum('frequency').notNull().default('daily'),
    // Times per frequency period.
    target: smallint('target').notNull().default(1),
    accent: accentEnum('accent'),
    reminderTime: time('reminder_time'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('habits_user_segment_idx').on(t.userId, t.lifeSegmentId),
    ...ownerPolicies('habits'),
  ]
);

export const habitCheckIns = planner.table(
  'habit_check_ins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    // Local calendar date in the user's time zone (5.4).
    date: date('date').notNull(),
    value: smallint('value').notNull().default(1),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('habit_check_ins_habit_date_idx').on(t.habitId, t.date),
    index('habit_check_ins_user_date_idx').on(t.userId, t.date),
    ...ownerPolicies('habit_check_ins'),
  ]
);

export const routines = planner.table(
  'routines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    kind: routineKindEnum('kind').notNull().default('custom'),
    name: text('name').notNull(),
    // 0 = Sunday … 6 = Saturday. Different days can run different routines.
    daysOfWeek: jsonb('days_of_week').$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    isTemplate: boolean('is_template').notNull().default(false),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('routines_user_kind_idx').on(t.userId, t.kind), ...ownerPolicies('routines')]
);

export const routineSteps = planner.table(
  'routine_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    routineId: uuid('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    title: text('title').notNull(),
    // Completing a step linked to a habit records the habit check-in (7.7).
    habitId: uuid('habit_id').references(() => habits.id, { onDelete: 'set null' }),
    durationMinutes: integer('duration_minutes'),
    ...timestamps(),
  },
  (t) => [
    index('routine_steps_routine_idx').on(t.routineId, t.sortOrder),
    ...ownerPolicies('routine_steps'),
  ]
);

export const routineCompletions = planner.table(
  'routine_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    routineId: uuid('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    completedStepIds: jsonb('completed_step_ids').$type<string[]>().notNull().default([]),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('routine_completions_routine_date_idx').on(t.routineId, t.date),
    ...ownerPolicies('routine_completions'),
  ]
);

export const moodEntries = planner.table(
  'mood_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    date: date('date').notNull(),
    // 1–5 scales
    mood: smallint('mood').notNull(),
    energy: smallint('energy').notNull(),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('mood_entries_user_date_idx').on(t.userId, t.date),
    ...ownerPolicies('mood_entries'),
  ]
);

/** Actual time spent; compared against planned `time_blocks`. */
export const timeEntries = planner.table(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    timeBlockId: uuid('time_block_id').references(() => timeBlocks.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    index('time_entries_user_started_idx').on(t.userId, t.startedAt),
    index('time_entries_task_idx').on(t.taskId),
    ...ownerPolicies('time_entries'),
  ]
);

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitCheckIn = typeof habitCheckIns.$inferSelect;
export type NewHabitCheckIn = typeof habitCheckIns.$inferInsert;
export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
export type RoutineStep = typeof routineSteps.$inferSelect;
export type NewRoutineStep = typeof routineSteps.$inferInsert;
export type RoutineCompletion = typeof routineCompletions.$inferSelect;
export type NewRoutineCompletion = typeof routineCompletions.$inferInsert;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type NewMoodEntry = typeof moodEntries.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
