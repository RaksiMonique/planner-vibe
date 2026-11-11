import { date, index, jsonb, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps, searchColumn } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { goals } from './planning';
import { ownerId } from './profiles';

export const journalKindEnum = planner.enum('journal_kind', [
  'daily',
  'gratitude',
  'wellness',
  'reflection',
]);
export const reviewKindEnum = planner.enum('review_kind', [
  'weekly',
  'monthly',
  'quarterly',
  'annual',
  'goal',
]);

export const journalEntries = planner.table(
  'journal_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    kind: journalKindEnum('kind').notNull().default('daily'),
    date: date('date').notNull(),
    title: text('title'),
    content: text('content').notNull(),
    /** Optional 1 to 5 mood noted with the entry. */
    mood: smallint('mood'),
    ...softDelete(),
    search: searchColumn(['title', 'content']),
    ...timestamps(),
  },
  (t) => [
    index('journal_entries_search_idx').using('gin', t.search),
    index('journal_entries_user_date_idx').on(t.userId, t.date, t.kind),
    ...ownerPolicies('journal_entries'),
  ]
);

/** A structured review: answers keyed by prompt id (instructions.md 8.20). */
export const reviews = planner.table(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    kind: reviewKindEnum('kind').notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').$type<Record<string, string>>().notNull().default({}),
    summary: text('summary'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('reviews_user_kind_period_idx').on(t.userId, t.kind, t.periodStart),
    ...ownerPolicies('reviews'),
  ]
);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type Review = typeof reviews.$inferSelect;
