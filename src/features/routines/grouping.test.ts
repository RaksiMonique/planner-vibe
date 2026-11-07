import { describe, expect, it } from 'vitest';
import { groupRoutinesByKind, historyStatus, isScheduledOn, routineProgress } from './grouping';

describe('groupRoutinesByKind', () => {
  it('keeps the fixed kind order and drops empty groups', () => {
    const groups = groupRoutinesByKind([
      { kind: 'custom' as const, name: 'c' },
      { kind: 'morning' as const, name: 'm' },
      { kind: 'morning' as const, name: 'm2' },
    ]);
    expect(groups.map((g) => g.kind)).toEqual(['morning', 'custom']);
    expect(groups[0].routines).toHaveLength(2);
  });
});

describe('isScheduledOn', () => {
  it('uses the weekday of the date key', () => {
    // 2026-11-07 is a Saturday (6), 2026-11-09 a Monday (1)
    expect(isScheduledOn([6], '2026-11-07')).toBe(true);
    expect(isScheduledOn([1, 2], '2026-11-07')).toBe(false);
    expect(isScheduledOn([1], '2026-11-09')).toBe(true);
  });
});

describe('routineProgress', () => {
  it('ignores completed ids for steps that no longer exist', () => {
    expect(routineProgress(['a', 'b'], ['a', 'zombie'])).toEqual({
      done: 1,
      total: 2,
      percent: 50,
      complete: false,
    });
    expect(routineProgress(['a'], ['a']).complete).toBe(true);
    expect(routineProgress([], []).complete).toBe(false);
  });
});

describe('historyStatus', () => {
  it('distinguishes done, partial, missed and unscheduled days', () => {
    const now = new Date();
    expect(historyStatus({ completedStepIds: ['a'], completedAt: now }, true)).toBe('done');
    expect(historyStatus({ completedStepIds: ['a'], completedAt: null }, true)).toBe('partial');
    expect(historyStatus(undefined, true)).toBe('missed');
    expect(historyStatus(undefined, false)).toBe('unscheduled');
    expect(historyStatus({ completedStepIds: ['a'], completedAt: null }, false)).toBe('partial');
  });
});
