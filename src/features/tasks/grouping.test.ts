import { describe, expect, it } from 'vitest';
import { groupForBoard, groupForList, groupForMatrix, quadrantOf } from './grouping';

const today = new Date(2026, 2, 4); // Wednesday 4 March 2026
const t = (dueDate: string | null, isImportant = false, status = 'todo') => ({
  dueDate,
  isImportant,
  status,
});

describe('groupForList', () => {
  it('places tasks by due status', () => {
    const g = groupForList(
      [t('2026-03-01'), t('2026-03-04'), t('2026-03-07'), t('2026-04-01'), t(null)],
      today,
      1
    );
    expect(g.overdue).toHaveLength(1);
    expect(g.today).toHaveLength(1);
    expect(g.this_week).toHaveLength(1);
    expect(g.later).toHaveLength(1);
    expect(g.none).toHaveLength(1);
  });
});

describe('quadrantOf and groupForMatrix', () => {
  it('uses urgency (today or overdue) and importance', () => {
    expect(quadrantOf(t('2026-03-04', true), today, 1)).toBe('do');
    expect(quadrantOf(t('2026-03-01', true), today, 1)).toBe('do');
    expect(quadrantOf(t('2026-03-20', true), today, 1)).toBe('schedule');
    expect(quadrantOf(t(null, true), today, 1)).toBe('schedule');
    expect(quadrantOf(t('2026-03-04', false), today, 1)).toBe('delegate');
    expect(quadrantOf(t('2026-03-20', false), today, 1)).toBe('eliminate');
  });
  it('groups into four quadrants', () => {
    const g = groupForMatrix([t('2026-03-04', true), t('2026-03-20')], today, 1);
    expect(g.do).toHaveLength(1);
    expect(g.eliminate).toHaveLength(1);
    expect(g.schedule).toHaveLength(0);
  });
});

describe('groupForBoard', () => {
  it('groups by status with unknown statuses in to do', () => {
    const g = groupForBoard([
      t(null, false, 'todo'),
      t(null, false, 'in_progress'),
      t(null, false, 'done'),
      t(null, false, 'odd'),
    ]);
    expect(g.todo).toHaveLength(2);
    expect(g.in_progress).toHaveLength(1);
    expect(g.done).toHaveLength(1);
  });
});
