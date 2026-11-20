import 'server-only';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { budgetMonths, financeReviews } from '@/db/schema';
import { firstDayOf } from './review';

export type BudgetMonth = typeof budgetMonths.$inferSelect;
export type FinanceReview = typeof financeReviews.$inferSelect;

/** Stored figures for one month, keyed by budget. */
export async function listBudgetMonths(
  userId: string,
  monthKey: string
): Promise<Map<string, BudgetMonth>> {
  const rows = await db
    .select()
    .from(budgetMonths)
    .where(and(eq(budgetMonths.userId, userId), eq(budgetMonths.month, firstDayOf(monthKey))));
  return new Map(rows.map((r) => [r.budgetId, r]));
}

export async function getFinanceReview(
  userId: string,
  monthKey: string
): Promise<FinanceReview | null> {
  const [row] = await db
    .select()
    .from(financeReviews)
    .where(and(eq(financeReviews.userId, userId), eq(financeReviews.month, firstDayOf(monthKey))))
    .limit(1);
  return row ?? null;
}

export type MonthTotal = { monthKey: string; spent: number; limit: number; reviewed: boolean };

/** Spent and limit summed per month over the stored rows, newest first. */
export async function listMonthTotals(
  userId: string,
  fromMonthKey: string,
  toMonthKey: string
): Promise<MonthTotal[]> {
  const [sums, reviews] = await Promise.all([
    db
      .select({
        month: budgetMonths.month,
        spent: sql<string>`coalesce(sum(${budgetMonths.spentAmount}), 0)`,
        limit: sql<string>`coalesce(sum(${budgetMonths.limitAmount}), 0)`,
      })
      .from(budgetMonths)
      .where(
        and(
          eq(budgetMonths.userId, userId),
          gte(budgetMonths.month, firstDayOf(fromMonthKey)),
          lte(budgetMonths.month, firstDayOf(toMonthKey))
        )
      )
      .groupBy(budgetMonths.month)
      .orderBy(desc(budgetMonths.month)),
    db
      .select({ month: financeReviews.month, completedAt: financeReviews.completedAt })
      .from(financeReviews)
      .where(
        and(
          eq(financeReviews.userId, userId),
          gte(financeReviews.month, firstDayOf(fromMonthKey)),
          lte(financeReviews.month, firstDayOf(toMonthKey))
        )
      ),
  ]);
  const done = new Set(reviews.filter((r) => r.completedAt).map((r) => r.month.slice(0, 7)));
  return sums.map((r) => ({
    monthKey: r.month.slice(0, 7),
    spent: Number(r.spent),
    limit: Number(r.limit),
    reviewed: done.has(r.month.slice(0, 7)),
  }));
}

/** Stored figures for several budgets in one month, for last-month comparisons. */
export async function listBudgetMonthsFor(
  userId: string,
  monthKey: string,
  budgetIds: string[]
): Promise<Map<string, BudgetMonth>> {
  if (budgetIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(budgetMonths)
    .where(
      and(
        eq(budgetMonths.userId, userId),
        eq(budgetMonths.month, firstDayOf(monthKey)),
        inArray(budgetMonths.budgetId, budgetIds)
      )
    );
  return new Map(rows.map((r) => [r.budgetId, r]));
}
