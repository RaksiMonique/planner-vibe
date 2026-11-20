import 'server-only';
import Decimal from 'decimal.js';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { budgetMonths, budgets, financeReviews, tasks } from '@/db/schema';
import { findFinanceSegment } from './summary';
import { listSegments } from '@/features/life-segments/service';
import { taskInput } from '@/features/tasks/schema';
import { createTask, type TaskContext } from '@/features/tasks/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { listBudgets } from './queries';
import { REVIEW_REMINDER_TITLE, defaultTaskDue, firstDayOf, lastDayOf, monthOf } from './review';
import type { BudgetTaskInput } from './schema';
import { requireBudget } from './service';

const money = (n: number | string) => new Decimal(n).toFixed(2);

/**
 * Sets what was spent on a budget in a month. For the month in progress the
 * live counter follows, so the snapshot page and the review agree.
 */
export async function setMonthSpending(
  userId: string,
  budgetId: string,
  monthKey: string,
  amount: number,
  todayKey: string
): Promise<void> {
  const budget = await requireBudget(userId, budgetId);
  const spentAmount = money(amount);
  await db
    .insert(budgetMonths)
    .values({
      userId,
      budgetId,
      month: firstDayOf(monthKey),
      limitAmount: budget.limitAmount,
      spentAmount,
    })
    .onConflictDoUpdate({
      target: [budgetMonths.budgetId, budgetMonths.month],
      set: { spentAmount, updatedAt: new Date() },
    });
  if (monthKey === monthOf(todayKey)) {
    await db
      .update(budgets)
      .set({ spentAmount })
      .where(and(eq(budgets.userId, userId), eq(budgets.id, budgetId)));
  }
}

export async function setMonthNote(
  userId: string,
  budgetId: string,
  monthKey: string,
  note: string | undefined,
  todayKey: string
): Promise<void> {
  const budget = await requireBudget(userId, budgetId);
  await db
    .insert(budgetMonths)
    .values({
      userId,
      budgetId,
      month: firstDayOf(monthKey),
      limitAmount: budget.limitAmount,
      spentAmount: monthKey === monthOf(todayKey) ? budget.spentAmount : '0.00',
      note: note || null,
    })
    .onConflictDoUpdate({
      target: [budgetMonths.budgetId, budgetMonths.month],
      set: { note: note || null, updatedAt: new Date() },
    });
}

/**
 * Finishes the month: every monthly budget gets a stored row for the month
 * (the live figure for the month in progress; earlier months keep what was
 * typed), the review is marked done, and when asked the live counters start
 * the new month at zero.
 */
export async function finishReview(
  userId: string,
  monthKey: string,
  opts: { note?: string; reset: boolean; todayKey: string }
): Promise<void> {
  const all = await listBudgets(userId);
  const monthly = all.filter((b) => b.period === 'monthly');
  const isCurrent = monthKey === monthOf(opts.todayKey);
  const now = new Date();
  for (const b of monthly) {
    await db
      .insert(budgetMonths)
      .values({
        userId,
        budgetId: b.id,
        month: firstDayOf(monthKey),
        limitAmount: b.limitAmount,
        spentAmount: isCurrent ? b.spentAmount : '0.00',
      })
      .onConflictDoUpdate({
        target: [budgetMonths.budgetId, budgetMonths.month],
        set: isCurrent
          ? { limitAmount: b.limitAmount, spentAmount: b.spentAmount, updatedAt: now }
          : { limitAmount: b.limitAmount, updatedAt: now },
      });
  }
  await db
    .insert(financeReviews)
    .values({ userId, month: firstDayOf(monthKey), note: opts.note || null, completedAt: now })
    .onConflictDoUpdate({
      target: [financeReviews.userId, financeReviews.month],
      set: { note: opts.note || null, completedAt: now, updatedAt: now },
    });
  if (opts.reset && monthly.length > 0) {
    await db
      .update(budgets)
      .set({ spentAmount: '0.00' })
      .where(
        and(eq(budgets.userId, userId), eq(budgets.period, 'monthly'), isNull(budgets.deletedAt))
      );
  }
}

/** A task that came out of reviewing a budget, in that budget's Life Segment. */
export async function createBudgetTask(
  userId: string,
  input: BudgetTaskInput,
  ctx: TaskContext
): Promise<void> {
  const budget = await requireBudget(userId, input.id);
  const dueDate =
    input.dueDate ?? (input.monthly ? defaultTaskDue(input.month, ctx.todayKey) : undefined);
  const parsed = taskInput.safeParse({
    title: input.title,
    lifeSegmentId: budget.lifeSegmentId,
    budgetId: budget.id,
    dueDate,
    recurrence: input.monthly ? 'monthly' : 'none',
  });
  if (!parsed.success)
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Check the task.');
  await createTask(userId, parsed.data, ctx);
}

/**
 * A repeating task that brings the user back here at the end of every month.
 * Creates it once; an open one already there is left alone.
 */
export async function ensureReviewReminder(
  userId: string,
  ctx: TaskContext
): Promise<{ created: boolean }> {
  const existing = await db.$count(
    tasks,
    and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      ne(tasks.status, 'done'),
      eq(tasks.title, REVIEW_REMINDER_TITLE),
      sql`${tasks.rrule} is not null`
    )
  );
  if (existing > 0) return { created: false };
  const segments = await listSegments(userId);
  const finance = findFinanceSegment(segments) ?? segments[0];
  if (!finance) throw new NotFoundError('Add a Life Segment first.');
  const parsed = taskInput.safeParse({
    title: REVIEW_REMINDER_TITLE,
    notes: 'Open Finance, then Monthly review, and walk through each budget.',
    lifeSegmentId: finance.id,
    dueDate: lastDayOf(monthOf(ctx.todayKey)),
    recurrence: 'monthly',
    recurrenceMonthly: 'day',
  });
  if (!parsed.success) throw new ValidationError('Could not set the reminder.');
  await createTask(userId, parsed.data, ctx);
  return { created: true };
}
