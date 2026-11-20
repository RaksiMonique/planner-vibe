import { date, index, integer, numeric, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
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
/** How the user expects to pay for a budget, so they know where cash is needed. */
export const budgetPaymentEnum = planner.enum('budget_payment', ['cash', 'credit', 'transfer']);

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
    /** Cash, credit or transfer; unset when the user has not said. */
    paymentMethod: budgetPaymentEnum('payment_method'),
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

/**
 * Monthly money review (instructions.md 8.22): one row per budget per month,
 * written when the user reviews the month. `month` is the first day of the
 * month. Figures are typed by hand; the live counter on `budgets` is the month
 * in progress, and these rows are the record once a month is reviewed.
 */
export const budgetMonths = planner.table(
  'budget_months',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    month: date('month').notNull(),
    limitAmount: numeric('limit_amount', { precision: 14, scale: 2 }).notNull(),
    spentAmount: numeric('spent_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('budget_months_budget_month_idx').on(t.budgetId, t.month),
    index('budget_months_user_month_idx').on(t.userId, t.month),
    ...ownerPolicies('budget_months'),
  ]
);

/** The month's review as a whole: an overall note and when it was finished. */
export const financeReviews = planner.table(
  'finance_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    month: date('month').notNull(),
    note: text('note'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('finance_reviews_user_month_idx').on(t.userId, t.month),
    ...ownerPolicies('finance_reviews'),
  ]
);
