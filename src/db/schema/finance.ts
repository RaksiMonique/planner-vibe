import { index, integer, numeric, text, uuid } from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';

/**
 * Financial snapshot (instructions.md 8.22): budgets at a glance, entered by
 * hand. Financial goals and savings progress are goals in the Finance segment
 * with measurable fields; upcoming financial actions are tasks and events in
 * that segment. Nothing here connects to any other application.
 */

export const budgetPeriodEnum = planner.enum('budget_period', ['monthly', 'annual']);

export const budgets = planner.table(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    category: text('category'),
    period: budgetPeriodEnum('period').notNull().default('monthly'),
    limitAmount: numeric('limit_amount', { precision: 14, scale: 2 }).notNull(),
    /** Updated by hand; reset when a new period starts. */
    spentAmount: numeric('spent_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    currency: text('currency'),
    note: text('note'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('budgets_user_idx').on(t.userId), ...ownerPolicies('budgets')]
);
