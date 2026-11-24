import { describe, expect, it } from 'vitest';
import { isStuck } from './stuck';

const today = '2026-11-23';
const day = (key: string) => new Date(`${key}T12:00:00Z`);
const base = {
  status: 'todo',
  dueDate: null,
  createdAt: day('2026-11-20'),
  updatedAt: day('2026-11-22'),
};

describe('isStuck', () => {
  it('is never stuck once done', () => {
    expect(isStuck({ ...base, status: 'done', dueDate: '2026-11-01' }, today)).toBe(false);
  });

  it('is stuck three or more days past its due date', () => {
    expect(isStuck({ ...base, dueDate: '2026-11-20' }, today)).toBe(true);
    expect(isStuck({ ...base, dueDate: '2026-11-01' }, today)).toBe(true);
    expect(isStuck({ ...base, status: 'in_progress', dueDate: '2026-11-18' }, today)).toBe(true);
  });

  it('is not stuck when due recently, today or later', () => {
    expect(isStuck({ ...base, dueDate: '2026-11-21' }, today)).toBe(false);
    expect(isStuck({ ...base, dueDate: '2026-11-23' }, today)).toBe(false);
    expect(isStuck({ ...base, dueDate: '2026-12-01' }, today)).toBe(false);
  });

  it('is stuck when undated, a fortnight old and untouched for a week', () => {
    const old = { ...base, createdAt: day('2026-11-01'), updatedAt: day('2026-11-10') };
    expect(isStuck(old, today)).toBe(true);
    expect(isStuck({ ...old, updatedAt: day('2026-11-16') }, today)).toBe(true);
  });

  it('an undated task that is young or recently touched is not stuck', () => {
    expect(isStuck({ ...base, createdAt: day('2026-11-12') }, today)).toBe(false);
    expect(
      isStuck({ ...base, createdAt: day('2026-11-01'), updatedAt: day('2026-11-20') }, today)
    ).toBe(false);
  });

  it('judges an old undated task by the due date once it has one', () => {
    const old = { ...base, createdAt: day('2026-10-01'), updatedAt: day('2026-10-01') };
    expect(isStuck({ ...old, dueDate: '2026-11-30' }, today)).toBe(false);
  });
});
