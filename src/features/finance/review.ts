import { endOfMonth, format, parseISO } from 'date-fns';
import type { SegmentRef } from '@/features/life-segments/types';
import { formatCurrency, sumAmounts, toAmount, type MoneyLike } from './summary';

/**
 * Monthly money review (instructions.md 8.22): pure rules for walking through
 * each Life Segment's budgets for one month. Figures are typed by hand; the
 * live counter on a budget stands for the month in progress and a stored row
 * for any month that has been reviewed or edited.
 */

export const REVIEW_REMINDER_TITLE = 'Monthly money review';

export type MonthFigure = { spent: number; limit: number; note: string | null } | null;

export type ReviewBudget = {
  id: string;
  name: string;
  category: string | null;
  period: 'monthly' | 'annual';
  limitAmount: MoneyLike;
  spentAmount: MoneyLike;
  currency: string | null;
  segment: SegmentRef;
};

export type StoredMonth = {
  budgetId: string;
  spentAmount: MoneyLike;
  limitAmount: MoneyLike;
  note: string | null;
};

/** 'yyyy-MM' of a 'yyyy-MM-dd' key. */
export function monthOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** The first day, as stored in the database. */
export function firstDayOf(monthKey: string): string {
  return `${monthKey}-01`;
}

export function lastDayOf(monthKey: string): string {
  return format(endOfMonth(parseISO(firstDayOf(monthKey))), 'yyyy-MM-dd');
}

/**
 * The figure to show for a budget in a month: the stored row when there is
 * one, otherwise the live counter for the month in progress, otherwise nothing.
 */
export function figureFor(
  budget: ReviewBudget,
  stored: StoredMonth | undefined,
  isCurrentMonth: boolean
): MonthFigure {
  if (stored) {
    return {
      spent: toAmount(stored.spentAmount),
      limit: toAmount(stored.limitAmount),
      note: stored.note,
    };
  }
  if (isCurrentMonth) {
    return { spent: toAmount(budget.spentAmount), limit: toAmount(budget.limitAmount), note: null };
  }
  return null;
}

export type ReviewGroup<B extends ReviewBudget> = {
  segment: SegmentRef;
  budgets: B[];
  spent: number;
  limit: number;
};

/** Budgets by Life Segment, in the budgets' own order, with the month's totals. */
export function groupBySegment<B extends ReviewBudget>(
  budgets: B[],
  figure: (b: B) => MonthFigure
): ReviewGroup<B>[] {
  const groups = new Map<string, ReviewGroup<B>>();
  for (const b of budgets) {
    const g = groups.get(b.segment.id) ?? { segment: b.segment, budgets: [], spent: 0, limit: 0 };
    g.budgets.push(b);
    const f = figure(b);
    if (f) {
      g.spent += f.spent;
      g.limit += f.limit;
    }
    groups.set(b.segment.id, g);
  }
  return [...groups.values()];
}

/** How this month's spending sits against last month's, in words. */
export function compareWording(
  spent: number,
  previous: number | null | undefined,
  currency: string
): string {
  if (previous === null || previous === undefined) return 'No figure for last month.';
  const diff = Math.round((spent - previous) * 100) / 100;
  if (diff === 0) return 'Same as last month.';
  return diff > 0
    ? `${formatCurrency(diff, currency)} more than last month.`
    : `${formatCurrency(-diff, currency)} less than last month.`;
}

/**
 * Finishing a review of an earlier month starts the new one, so the live
 * counters go back to zero by default; reviewing the month in progress
 * leaves them alone unless asked.
 */
export function resetByDefault(monthKey: string, todayKey: string): boolean {
  return monthKey < monthOf(todayKey);
}

/** Where a task from the review falls due when no date is given. */
export function defaultTaskDue(monthKey: string, todayKey: string): string {
  const last = lastDayOf(monthKey);
  return last < todayKey ? todayKey : last;
}

export function monthTotals(figures: MonthFigure[]): { spent: number; limit: number } {
  const present = figures.filter((f): f is NonNullable<MonthFigure> => f !== null);
  return {
    spent: sumAmounts(present.map((f) => f.spent)),
    limit: sumAmounts(present.map((f) => f.limit)),
  };
}
