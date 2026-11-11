import Decimal from 'decimal.js';

/**
 * Pure helpers for the Financial snapshot. Money columns arrive as numeric
 * strings from the database; everything here accepts strings or numbers and
 * does its sums with decimal.js (docs/schema.md conventions).
 */

export type MoneyLike = string | number | null | undefined;

export function toAmount(value: MoneyLike): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Sum of amounts, exact to the cent. */
export function sumAmounts(values: MoneyLike[]): number {
  return values.reduce((acc, v) => acc.plus(toAmount(v)), new Decimal(0)).toNumber();
}

/** Spent as a whole percentage of the limit; may exceed 100. A zero limit reads as 0 or 100. */
export function percentSpent(spent: MoneyLike, limit: MoneyLike): number {
  const l = toAmount(limit);
  const s = toAmount(spent);
  if (l <= 0) return s > 0 ? 100 : 0;
  return Math.max(0, Math.round((s / l) * 100));
}

/** Limit minus spent; negative when over the limit. */
export function remaining(spent: MoneyLike, limit: MoneyLike): number {
  return new Decimal(toAmount(limit)).minus(toAmount(spent)).toNumber();
}

export function isOverLimit(spent: MoneyLike, limit: MoneyLike): boolean {
  return toAmount(spent) > toAmount(limit);
}

/**
 * Money formatted for display with a fixed locale so the server and the browser
 * agree on the output. Unknown codes fall back to "CODE 1,234.50".
 */
export function formatCurrency(value: MoneyLike, currency: string): string {
  const n = toAmount(value);
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  }
}

/** A plain number for measurable goals in any unit (steps, books, dollars). */
export function formatAmount(value: MoneyLike): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(toAmount(value));
}

export type BudgetLike = {
  period: 'monthly' | 'annual';
  limitAmount: MoneyLike;
  spentAmount: MoneyLike;
};

export type BudgetTotals = {
  count: number;
  limit: number;
  spent: number;
  remaining: number;
  overCount: number;
};

export function budgetTotals(budgets: BudgetLike[]): BudgetTotals {
  const limit = sumAmounts(budgets.map((b) => b.limitAmount));
  const spent = sumAmounts(budgets.map((b) => b.spentAmount));
  return {
    count: budgets.length,
    limit,
    spent,
    remaining: new Decimal(limit).minus(spent).toNumber(),
    overCount: budgets.filter((b) => isOverLimit(b.spentAmount, b.limitAmount)).length,
  };
}

export function totalsByPeriod(budgets: BudgetLike[]): Record<'monthly' | 'annual', BudgetTotals> {
  return {
    monthly: budgetTotals(budgets.filter((b) => b.period === 'monthly')),
    annual: budgetTotals(budgets.filter((b) => b.period === 'annual')),
  };
}

export type MeasurableGoalLike = {
  targetValue: MoneyLike;
  currentValue: MoneyLike;
  unit: string | null;
};

export function isMeasurable(goal: MeasurableGoalLike): boolean {
  return toAmount(goal.targetValue) > 0;
}

/** Sum of current values of measurable goals counted in the user's currency. */
export function savingsTotal(goals: MeasurableGoalLike[], currency: string): number {
  const code = currency.trim().toUpperCase();
  return sumAmounts(
    goals
      .filter((g) => isMeasurable(g) && (g.unit ?? '').trim().toUpperCase() === code)
      .map((g) => g.currentValue)
  );
}

export type SegmentLike = { slug: string; name: string };

/** The Finance segment: slug `finance`, else a name that reads like money, else none. */
export function findFinanceSegment<T extends SegmentLike>(segments: T[]): T | null {
  return (
    segments.find((s) => s.slug === 'finance') ??
    segments.find((s) => /financ|money|saving/i.test(s.name)) ??
    null
  );
}

/** Calendar days from `todayKey` to `dateKey` (yyyy-MM-dd); negative when past. */
export function daysFromToday(dateKey: string, todayKey: string): number {
  const utc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(dateKey) - utc(todayKey)) / 86_400_000);
}
