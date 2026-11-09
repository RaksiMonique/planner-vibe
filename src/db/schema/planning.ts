import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  numeric,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { recurrence, softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';

export const goalHorizonEnum = planner.enum('goal_horizon', [
  'lifelong',
  'annual',
  'quarterly',
  'monthly',
  'weekly',
]);
export const goalStatusEnum = planner.enum('goal_status', [
  'planned',
  'active',
  'on_hold',
  'achieved',
  'abandoned',
]);
export const projectStatusEnum = planner.enum('project_status', [
  'planned',
  'active',
  'on_hold',
  'done',
  'archived',
]);
export const taskStatusEnum = planner.enum('task_status', ['todo', 'in_progress', 'done']);
export const priorityEnum = planner.enum('priority', ['low', 'medium', 'high']);

export type GoalHorizon = (typeof goalHorizonEnum.enumValues)[number];

/**
 * Goals at five horizons (instructions.md 5.5). Breaking a goal down creates
 * child goals through `parent_goal_id`; the service layer enforces that a
 * parent sits at a longer horizon than its child.
 */
export const goals = planner.table(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    parentGoalId: uuid('parent_goal_id').references((): AnyPgColumn => goals.id, {
      onDelete: 'set null',
    }),
    horizon: goalHorizonEnum('horizon').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: goalStatusEnum('status').notNull().default('planned'),
    targetDate: date('target_date'),
    // Optional measurable outcome (money or any unit; decimal.js for maths).
    targetValue: numeric('target_value', { precision: 14, scale: 2 }),
    currentValue: numeric('current_value', { precision: 14, scale: 2 }),
    unit: text('unit'),
    // 0–100, computed from children, milestones or measurable fields; stored for display.
    progress: smallint('progress').notNull().default(0),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('goals_user_segment_idx').on(t.userId, t.lifeSegmentId),
    index('goals_user_horizon_idx').on(t.userId, t.horizon),
    index('goals_parent_idx').on(t.parentGoalId),
    ...ownerPolicies('goals'),
  ]
);

export const projects = planner.table(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description'),
    status: projectStatusEnum('status').notNull().default('planned'),
    startDate: date('start_date'),
    dueDate: date('due_date'),
    progress: smallint('progress').notNull().default(0),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('projects_user_segment_idx').on(t.userId, t.lifeSegmentId),
    index('projects_user_status_idx').on(t.userId, t.status),
    ...ownerPolicies('projects'),
  ]
);

/** Project ↔ Goal is many-to-many (instructions.md 5.3). */
export const goalProjects = planner.table(
  'goal_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('goal_projects_pair_idx').on(t.goalId, t.projectId),
    ...ownerPolicies('goal_projects'),
  ]
);

/** Checkpoint in a goal or project; inherits its segment from the parent. */
export const milestones = planner.table(
  'milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    dueDate: date('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index('milestones_goal_idx').on(t.goalId),
    index('milestones_project_idx').on(t.projectId),
    ...ownerPolicies('milestones'),
  ]
);

export const tasks = planner.table(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
    milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
    parentTaskId: uuid('parent_task_id').references((): AnyPgColumn => tasks.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    notes: text('notes'),
    status: taskStatusEnum('status').notNull().default('todo'),
    priority: priorityEnum('priority').notNull().default('medium'),
    // Eisenhower importance; urgency is derived from the due date (5.5).
    isImportant: boolean('is_important').notNull().default(false),
    dueDate: date('due_date'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...recurrence(),
    recurrenceParentId: uuid('recurrence_parent_id').references((): AnyPgColumn => tasks.id, {
      onDelete: 'cascade',
    }),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('tasks_user_segment_idx').on(t.userId, t.lifeSegmentId),
    index('tasks_user_due_idx').on(t.userId, t.dueDate),
    index('tasks_user_status_idx').on(t.userId, t.status),
    index('tasks_project_idx').on(t.projectId),
    index('tasks_parent_idx').on(t.parentTaskId),
    ...ownerPolicies('tasks'),
  ]
);

export const taskDependencies = planner.table(
  'task_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    dependsOnTaskId: uuid('depends_on_task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('task_dependencies_pair_idx').on(t.taskId, t.dependsOnTaskId),
    ...ownerPolicies('task_dependencies'),
  ]
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type GoalProject = typeof goalProjects.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskDependency = typeof taskDependencies.$inferSelect;
