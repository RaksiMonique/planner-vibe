import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { softDelete, timestamps, searchColumn } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { priorityEnum } from './planning';
import { ownerId } from './profiles';

export const testamentEnum = planner.enum('testament', ['old', 'new']);
export const bibleStudyKindEnum = planner.enum('bible_study_kind', [
  'study',
  'devotional',
  'reading',
  'course',
]);
export const bibleStudyStatusEnum = planner.enum('bible_study_status', [
  'not_started',
  'in_progress',
  'done',
]);
export const readingPlanStatusEnum = planner.enum('reading_plan_status', [
  'active',
  'paused',
  'done',
]);
export const prayerKindEnum = planner.enum('prayer_kind', ['intention', 'journal']);

/**
 * Reference data: the 73 books of the Catholic canon with NABRE chapter counts,
 * inserted by migration. Not user-owned, so no RLS policies (instructions.md 8.1).
 */
export const bibleBooks = planner.table('bible_books', {
  /** Canonical order, 1 to 73. */
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  abbreviation: text('abbreviation').notNull(),
  testament: testamentEnum('testament').notNull(),
  category: text('category').notNull(),
  chapters: smallint('chapters').notNull(),
  deuterocanonical: boolean('deuterocanonical').notNull().default(false),
});

/** A passage reference stored as book, chapter and verses; never the text itself. */
export const scriptureReferences = planner.table(
  'scripture_references',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    bookId: integer('book_id')
      .notNull()
      .references(() => bibleBooks.id),
    chapter: smallint('chapter').notNull(),
    verseStart: smallint('verse_start'),
    verseEnd: smallint('verse_end'),
    chapterEnd: smallint('chapter_end'),
    /** Display form such as "John 3:1-21", computed on write. */
    label: text('label').notNull(),
    isBookmark: boolean('is_bookmark').notNull().default(false),
    isFavourite: boolean('is_favourite').notNull().default(false),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    index('scripture_references_user_idx').on(t.userId, t.bookId, t.chapter),
    ...ownerPolicies('scripture_references'),
  ]
);

export const bibleStudies = planner.table(
  'bible_studies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    kind: bibleStudyKindEnum('kind').notNull().default('study'),
    status: bibleStudyStatusEnum('status').notNull().default('not_started'),
    priority: priorityEnum('priority').notNull().default('medium'),
    translation: text('translation'),
    prerequisiteId: uuid('prerequisite_id'),
    description: text('description'),
    lastStudiedAt: timestamp('last_studied_at', { withTimezone: true }),
    ...softDelete(),
    search: searchColumn(['title', 'description']),
    ...timestamps(),
  },
  (t) => [
    index('bible_studies_search_idx').using('gin', t.search),
    index('bible_studies_user_status_idx').on(t.userId, t.status),
    ...ownerPolicies('bible_studies'),
  ]
);

export const bibleStudyNotes = planner.table(
  'bible_study_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    studyId: uuid('study_id')
      .notNull()
      .references(() => bibleStudies.id, { onDelete: 'cascade' }),
    referenceId: uuid('reference_id').references(() => scriptureReferences.id, {
      onDelete: 'set null',
    }),
    content: text('content').notNull(),
    ...timestamps(),
  },
  (t) => [
    index('bible_study_notes_study_idx').on(t.studyId, t.createdAt),
    ...ownerPolicies('bible_study_notes'),
  ]
);

/** A reading plan over a set of books (null scope = the whole canon), so many chapters a day. */
export const readingPlans = planner.table(
  'reading_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    /** Ordered book ids; null means every book in canonical order. */
    bookIds: jsonb('book_ids').$type<number[] | null>(),
    chaptersPerDay: smallint('chapters_per_day').notNull().default(1),
    startDate: date('start_date').notNull(),
    status: readingPlanStatusEnum('status').notNull().default('active'),
    /** Queue: this plan starts the day the named plan is finished. One successor per plan. */
    startsAfterPlanId: uuid('starts_after_plan_id').references((): AnyPgColumn => readingPlans.id, {
      onDelete: 'set null',
    }),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('reading_plans_user_idx').on(t.userId, t.status),
    uniqueIndex('reading_plans_successor_idx').on(t.startsAfterPlanId),
    ...ownerPolicies('reading_plans'),
  ]
);

export const readingProgress = planner.table(
  'reading_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => readingPlans.id, { onDelete: 'cascade' }),
    bookId: integer('book_id')
      .notNull()
      .references(() => bibleBooks.id),
    chapter: smallint('chapter').notNull(),
    readOn: date('read_on').notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('reading_progress_plan_chapter_idx').on(t.planId, t.bookId, t.chapter),
    index('reading_progress_user_date_idx').on(t.userId, t.readOn),
    ...ownerPolicies('reading_progress'),
  ]
);

export const prayerEntries = planner.table(
  'prayer_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    kind: prayerKindEnum('kind').notNull().default('intention'),
    date: date('date').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    /** Intentions only: when the prayer was answered. */
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    ...softDelete(),
    search: searchColumn(['title', 'content']),
    ...timestamps(),
  },
  (t) => [
    index('prayer_entries_search_idx').using('gin', t.search),
    index('prayer_entries_user_date_idx').on(t.userId, t.date),
    ...ownerPolicies('prayer_entries'),
  ]
);

export const devotionalEntries = planner.table(
  'devotional_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    date: date('date').notNull(),
    title: text('title').notNull(),
    source: text('source'),
    referenceId: uuid('reference_id').references(() => scriptureReferences.id, {
      onDelete: 'set null',
    }),
    reflection: text('reflection'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('devotional_entries_user_date_idx').on(t.userId, t.date),
    ...ownerPolicies('devotional_entries'),
  ]
);

export type BibleBook = typeof bibleBooks.$inferSelect;
export type ScriptureReference = typeof scriptureReferences.$inferSelect;
export type BibleStudy = typeof bibleStudies.$inferSelect;
export type BibleStudyNote = typeof bibleStudyNotes.$inferSelect;
export type ReadingPlan = typeof readingPlans.$inferSelect;
export type ReadingProgressRow = typeof readingProgress.$inferSelect;
export type PrayerEntry = typeof prayerEntries.$inferSelect;
export type DevotionalEntry = typeof devotionalEntries.$inferSelect;
