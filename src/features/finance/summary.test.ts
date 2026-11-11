import { describe, expect, it } from 'vitest';
import {
  budgetTotals,
  daysFromToday,
  findFinanceSegment,
  formatAmount,
  formatCurrency,
  isOverLimit,
  percentSpent,
  remaining,
  savingsTotal,
  sumAmounts,
  toAmount,
  totalsByPeriod,
} from './summary';

describe('amounts', () => {
  it('reads numeric strings, numbers and blanks', () => {
    expect(toAmount('12.50')).toBe(12.5);
    expect(toAmount(3)).toBe(3);
    expect(toAmount(null)).toBe(0);
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount('')).toBe(0);
    expect(toAmount('abc')).toBe(0);
  });
  it('sums to the cent without floating-point drift', () => {
    expect(sumAmounts(['0.10', '0.20', 0.3])).toBe(0.6);
    expect(sumAmounts([])).toBe(0);
  });
});

describe('percentSpent, remaining and the over-limit flag', () => {
  it('rounds to a whole percentage and may exceed 100', () => {
    expect(percentSpent('25', '100')).toBe(25);
    expect(percentSpent('33.33', '100')).toBe(33);
    expect(percentSpent('150', '100')).toBe(150);
  });
  it('treats a zero limit as 0 or 100', () => {
    expect(percentSpent('0', '0')).toBe(0);
    expect(percentSpent('5', '0')).toBe(100);
  });
  it('computes what is left, negative when over', () => {
    expect(remaining('40.25', '100')).toBe(59.75);
    expect(remaining('120', '100')).toBe(-20);
  });
  it('flags only amounts above the limit', () => {
    expect(isOverLimit('100', '100')).toBe(false);
    expect(isOverLimit('100.01', '100')).toBe(true);
  });
});

describe('formatting', () => {
  it('formats money with a stable en-GB locale', () => {
    expect(formatCurrency('1234.5', 'USD')).toBe('$1,234.50');
    expect(formatCurrency(0, 'GBP')).toBe('£0.00');
    expect(formatCurrency('1234.5', 'JMD')).toBe('$1,234.50');
  });
  it('shows the code for currencies without a symbol and survives a malformed code', () => {
    expect(formatCurrency('10', 'ZZZ')).toMatch(/^ZZZ\s10\.00$/);
    expect(formatCurrency('10', 'US')).toMatch(/^US\s10\.00$/);
  });
  it('formats plain amounts for measurable goals', () => {
    expect(formatAmount('4500.00')).toBe('4,500');
    expect(formatAmount('12.345')).toBe('12.35');
  });
});

describe('totals', () => {
  const budgets = [
    { period: 'monthly' as const, limitAmount: '100', spentAmount: '40' },
    { period: 'monthly' as const, limitAmount: '50', spentAmount: '60' },
    { period: 'annual' as const, limitAmount: '1200', spentAmount: '0' },
  ];
  it('adds limits and spending and counts budgets over their limit', () => {
    expect(budgetTotals(budgets)).toEqual({
      count: 3,
      limit: 1350,
      spent: 100,
      remaining: 1250,
      overCount: 1,
    });
  });
  it('splits totals by period', () => {
    const by = totalsByPeriod(budgets);
    expect(by.monthly).toMatchObject({ count: 2, limit: 150, spent: 100, overCount: 1 });
    expect(by.annual).toMatchObject({ count: 1, limit: 1200, spent: 0, overCount: 0 });
  });
  it('sums savings only for measurable goals in the user currency', () => {
    const goals = [
      { targetValue: '12000', currentValue: '4500', unit: 'JMD' },
      { targetValue: '500', currentValue: '100', unit: 'jmd' },
      { targetValue: '10', currentValue: '3', unit: 'books' },
      { targetValue: null, currentValue: '999', unit: 'JMD' },
    ];
    expect(savingsTotal(goals, 'JMD')).toBe(4600);
    expect(savingsTotal(goals, 'USD')).toBe(0);
  });
});

describe('findFinanceSegment', () => {
  it('prefers the finance slug, then a money-like name, else none', () => {
    expect(
      findFinanceSegment([
        { slug: 'money-matters', name: 'Money matters' },
        { slug: 'finance', name: 'Wealth' },
      ])?.slug
    ).toBe('finance');
    expect(
      findFinanceSegment([
        { slug: 'faith', name: 'Faith' },
        { slug: 'cash', name: 'Savings and spending' },
      ])?.slug
    ).toBe('cash');
    expect(findFinanceSegment([{ slug: 'faith', name: 'Faith' }])).toBeNull();
  });
});

describe('daysFromToday', () => {
  it('counts calendar days either side of today', () => {
    expect(daysFromToday('2026-11-12', '2026-11-10')).toBe(2);
    expect(daysFromToday('2026-11-08', '2026-11-10')).toBe(-2);
    expect(daysFromToday('2026-11-10', '2026-11-10')).toBe(0);
  });
});
