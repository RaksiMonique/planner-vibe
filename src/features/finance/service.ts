import 'server-only';
import Decimal from 'decimal.js';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { budgets } from '@/db/schema';
import { getSegmentById } from '@/features/life-segments/service';
import { NotFoundError } from '@/lib/errors';
import type { Budget } from './queries';
import type { BudgetInput } from './schema';

export async function requireBudget(userId: string, id: string): Promise<Budget> {
  const [row] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id), isNull(budgets.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That budget does not exist.');
  return row;
}

const money = (n: number) => new Decimal(n).toFixed(2);

function toRow(input: BudgetInput, fallbackCurrency: string) {
  return {
    name: input.name,
    category: input.category || null,
    period: input.period,
    lifeSegmentId: input.lifeSegmentId,
    limitAmount: money(input.limitAmount),
    currency: input.currency ?? fallbackCurrency,
    note: input.note || null,
  };
}

/** New budgets start at the given spending (default 0) in the user's currency unless told otherwise. */
export async function createBudget(
  userId: string,
  input: BudgetInput,
  fallbackCurrency: string
): Promise<Budget> {
  await getSegmentById(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(budgets)
    .values({
      userId,
      ...toRow(input, fallbackCurrency),
      spentAmount: money(input.spentAmount ?? 0),
    })
    .returning();
  return row;
}

/** Edits the definition; spending moves only through `recordSpending` and `resetBudgetPeriod` unless given. */
export async function updateBudget(
  userId: string,
  id: string,
  input: BudgetInput,
  fallbackCurrency: string
): Promise<Budget> {
  const current = await requireBudget(userId, id);
  await getSegmentById(userId, input.lifeSegmentId);
  const [row] = await db
    .update(budgets)
    .set({
      ...toRow(input, current.currency ?? fallbackCurrency),
      ...(input.spentAmount === undefined ? {} : { spentAmount: money(input.spentAmount) }),
    })
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
    .returning();
  return row;
}

/** Adds an amount to what has been spent this period. */
export async function recordSpending(userId: string, id: string, amount: number): Promise<Budget> {
  const current = await requireBudget(userId, id);
  const spentAmount = new Decimal(current.spentAmount).plus(amount).toFixed(2);
  const [row] = await db
    .update(budgets)
    .set({ spentAmount })
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
    .returning();
  return row;
}

/** A new month or year: spending goes back to zero, the limit stays. */
export async function resetBudgetPeriod(userId: string, id: string): Promise<Budget> {
  await requireBudget(userId, id);
  const [row] = await db
    .update(budgets)
    .set({ spentAmount: '0.00' })
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
    .returning();
  return row;
}

export async function removeBudget(userId: string, id: string): Promise<void> {
  await requireBudget(userId, id);
  await db
    .update(budgets)
    .set({ deletedAt: new Date() })
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)));
}
