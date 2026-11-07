import { date, index, integer, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { accentEnum, lifeSegments } from './organisation';
import { projects, tasks } from './planning';
import { ownerId } from './profiles';
import { timeEntries } from './tracking';

export const courseStatusEnum = planner.enum('course_status', [
  'planned',
  'in_progress',
  'done',
  'dropped',
]);
export const studySessionKindEnum = planner.enum('study_session_kind', [
  'focus',
  'pomodoro',
  'reading',
  'review',
]);
export const resourceKindEnum = planner.enum('resource_kind', [
  'link',
  'book',
  'video',
  'file',
  'other',
]);

export const subjects = planner.table(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    accent: accentEnum('accent'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('subjects_user_idx').on(t.userId, t.name), ...ownerPolicies('subjects')]
);

/** A course or certification with a defined outcome; may optionally be a project (instructions.md 1.3). */
export const courses = planner.table(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    provider: text('provider'),
    url: text('url'),
    status: courseStatusEnum('status').notNull().default('planned'),
    startDate: date('start_date'),
    dueDate: date('due_date'),
    /** Manual fallback; lessons drive progress when they exist. */
    progress: smallint('progress').notNull().default(0),
    notes: text('notes'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('courses_user_status_idx').on(t.userId, t.status), ...ownerPolicies('courses')]
);

export const lessons = planner.table(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    durationMinutes: integer('duration_minutes'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('lessons_course_idx').on(t.courseId, t.sortOrder), ...ownerPolicies('lessons')]
);

/** A study session; Pomodoro sessions are also saved as time entries (instructions.md 8.3). */
export const studySessions = planner.table(
  'study_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
    lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    timeEntryId: uuid('time_entry_id').references(() => timeEntries.id, { onDelete: 'set null' }),
    kind: studySessionKindEnum('kind').notNull().default('focus'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),
    pomodoros: smallint('pomodoros').notNull().default(0),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    index('study_sessions_user_started_idx').on(t.userId, t.startedAt),
    ...ownerPolicies('study_sessions'),
  ]
);

export const studyNotes = planner.table(
  'study_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
    lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    content: text('content'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('study_notes_user_idx').on(t.userId, t.updatedAt), ...ownerPolicies('study_notes')]
);

/** An assignment with a deadline; mirrored as a task so it shows in Tasks and the calendar. */
export const assignments = planner.table(
  'assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    dueDate: date('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('assignments_user_due_idx').on(t.userId, t.dueDate),
    ...ownerPolicies('assignments'),
  ]
);

export const learningResources = planner.table(
  'learning_resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
    kind: resourceKindEnum('kind').notNull().default('link'),
    title: text('title').notNull(),
    url: text('url'),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    index('learning_resources_user_idx').on(t.userId, t.courseId),
    ...ownerPolicies('learning_resources'),
  ]
);

export type Subject = typeof subjects.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type StudyNote = typeof studyNotes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type LearningResource = typeof learningResources.$inferSelect;
