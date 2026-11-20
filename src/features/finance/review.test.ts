import { describe, expect, it } from 'vitest';
import {
  compareWording,
  defaultTaskDue,
  figureFor,
  groupBySegment,
  lastDayOf,
  monthOf,
  resetByDefault,
} from './review';

const seg = (id: string) => ({ id, name: id, slug: id, accent: 'plum' as const });
const budget = (id: string, segment: string, spent = '10.00', limit = '100.00') => ({
  id,
  name: id,
  category: null,
  period: 'monthly' as const,
  limitAmount: limit,
  spentAmount: spent,
  currency: null,
  segment: seg(segment),
});

describe('month keys', () => {
  it('derives the month and its last day', () => {
    expect(monthOf('2026-11-19')).toBe('2026-11');
    expect(lastDayOf('2026-02')).toBe('2026-02-28');
    expect(lastDayOf('2028-02')).toBe('2028-02-29');
  });
});

describe('figureFor', () => {
  it('prefers the stored row, then the live counter for the month in progress', () => {
    const b = budget('a', 's', '40.00', '100.00');
    expect(
      figureFor(b, { budgetId: 'a', spentAmount: '55', limitAmount: '90', note: 'x' }, true)
    ).toEqual({ spent: 55, limit: 90, note: 'x' });
    expect(figureFor(b, undefined, true)).toEqual({ spent: 40, limit: 100, note: null });
    expect(figureFor(b, undefined, false)).toBeNull();
  });
});

describe('groupBySegment', () => {
  it('keeps budget order, totals what has figures and skips what has none', () => {
    const list = [
      budget('a', 'home'),
      budget('b', 'fun', '5', '20'),
      budget('c', 'home', '1', '2'),
    ];
    const groups = groupBySegment(list, (b) =>
      b.id === 'c' ? null : figureFor(b, undefined, true)
    );
    expect(groups.map((g) => g.segment.id)).toEqual(['home', 'fun']);
    expect(groups[0].budgets.map((b) => b.id)).toEqual(['a', 'c']);
    expect(groups[0]).toMatchObject({ spent: 10, limit: 100 });
    expect(groups[1]).toMatchObject({ spent: 5, limit: 20 });
  });
});

describe('wording and defaults', () => {
  it('compares with last month', () => {
    expect(compareWording(50, null, 'USD')).toBe('No figure for last month.');
    expect(compareWording(50, 50, 'USD')).toBe('Same as last month.');
    expect(compareWording(62.5, 50, 'USD')).toMatch(/12\.50 more than last month/);
    expect(compareWording(40, 50, 'USD')).toMatch(/10\.00 less than last month/);
  });
  it('resets counters only when an earlier month is being reviewed', () => {
    expect(resetByDefault('2026-10', '2026-11-19')).toBe(true);
    expect(resetByDefault('2026-11', '2026-11-19')).toBe(false);
  });
  it('dates a new task to the end of the month, or today once that has passed', () => {
    expect(defaultTaskDue('2026-11', '2026-11-19')).toBe('2026-11-30');
    expect(defaultTaskDue('2026-10', '2026-11-19')).toBe('2026-11-19');
  });
});
