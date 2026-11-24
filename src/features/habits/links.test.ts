import { describe, expect, it } from 'vitest';
import { linkColumns, linkHref, linkOf, nextPlanItem, parseLinkValue } from './links';

const item = (id: string, sortOrder: number, plannedDate: string | null = null, done = false) => ({
  id,
  title: id,
  sortOrder,
  plannedDate,
  completedAt: done ? new Date() : null,
});

describe('nextPlanItem', () => {
  it('skips completed items and follows the queue order', () => {
    const items = [item('b', 1), item('a', 0, null, true), item('c', 2)];
    expect(nextPlanItem(items, '2026-11-23')?.id).toBe('b');
  });
  it('puts items dated today or earlier before the undated queue, oldest first', () => {
    const items = [item('queue', 0), item('today', 5, '2026-11-23'), item('late', 6, '2026-11-20')];
    expect(nextPlanItem(items, '2026-11-23')?.id).toBe('late');
  });
  it('falls back to the nearest future item when nothing else is open', () => {
    const items = [item('far', 0, '2026-12-24'), item('near', 1, '2026-11-30')];
    expect(nextPlanItem(items, '2026-11-23')?.id).toBe('near');
  });
  it('returns null with nothing open', () => {
    expect(nextPlanItem([item('a', 0, null, true)], '2026-11-23')).toBeNull();
    expect(nextPlanItem([], '2026-11-23')).toBeNull();
  });
});

describe('links', () => {
  it('parses a kind:id value and rejects junk', () => {
    expect(parseLinkValue('course:abc')).toEqual({ kind: 'course', id: 'abc' });
    expect(parseLinkValue('')).toBeNull();
    expect(parseLinkValue('workout:abc')).toBeNull();
    expect(parseLinkValue('course:')).toBeNull();
  });
  it('stores exactly one column and reads it back', () => {
    const cols = linkColumns({ kind: 'reading_plan', id: 'p1' });
    expect(cols).toEqual({
      courseId: null,
      subjectId: null,
      bibleStudyId: null,
      readingPlanId: 'p1',
      routineId: null,
      goalId: null,
    });
    expect(linkOf(cols)).toEqual({ kind: 'reading_plan', id: 'p1' });
    expect(linkOf(linkColumns(null))).toBeNull();
  });
  it('a goal is a link kind with its own page', () => {
    expect(parseLinkValue('goal:g1')).toEqual({ kind: 'goal', id: 'g1' });
    const cols = linkColumns({ kind: 'goal', id: 'g1' });
    expect(cols.goalId).toBe('g1');
    expect(cols.courseId).toBeNull();
    expect(linkOf(cols)).toEqual({ kind: 'goal', id: 'g1' });
    expect(linkHref({ kind: 'goal', id: 'g1' })).toBe('/goals/g1');
  });
});
