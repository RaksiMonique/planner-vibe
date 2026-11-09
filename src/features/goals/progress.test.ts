import { describe, expect, it } from 'vitest';
import { canBeChildOf, computeGoalProgress } from './progress';

const base = { status: 'active', targetValue: null, currentValue: null, progress: 0 };

describe('computeGoalProgress', () => {
  it('is 100 when achieved, whatever else is set', () => {
    expect(
      computeGoalProgress({ ...base, status: 'achieved', progress: 10 }, [5], { total: 4, done: 0 })
    ).toBe(100);
  });
  it('prefers a measurable target', () => {
    expect(
      computeGoalProgress({ ...base, targetValue: '200', currentValue: '50' }, [90], {
        total: 2,
        done: 2,
      })
    ).toBe(25);
    expect(
      computeGoalProgress({ ...base, targetValue: 10, currentValue: 25 }, [], { total: 0, done: 0 })
    ).toBe(100);
  });
  it('averages children before counting milestones', () => {
    expect(computeGoalProgress(base, [20, 40], { total: 2, done: 2 })).toBe(30);
    expect(computeGoalProgress(base, [], { total: 4, done: 1 })).toBe(25);
  });
  it('falls back to the stored percentage, clamped', () => {
    expect(computeGoalProgress({ ...base, progress: 42 }, [], { total: 0, done: 0 })).toBe(42);
    expect(computeGoalProgress({ ...base, progress: 140 }, [], { total: 0, done: 0 })).toBe(100);
  });
});

describe('canBeChildOf', () => {
  it('only allows shorter horizons under longer ones', () => {
    expect(canBeChildOf('annual', 'lifelong')).toBe(true);
    expect(canBeChildOf('weekly', 'monthly')).toBe(true);
    expect(canBeChildOf('annual', 'annual')).toBe(false);
    expect(canBeChildOf('lifelong', 'weekly')).toBe(false);
  });
});
