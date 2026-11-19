import { describe, expect, it } from 'vitest';
import { dueAssignments } from './due';

const row = (id: string, dueDate: string | null) => ({ id, dueDate });

describe('dueAssignments', () => {
  it('shows today and upcoming first, then undated, and counts overdue apart', () => {
    const rows = [
      row('late', '2026-03-01'),
      row('today', '2026-03-10'),
      row('soon', '2026-03-12'),
      row('open', null),
    ];
    const out = dueAssignments(rows, '2026-03-10', 4);
    expect(out.shown.map((r) => r.id)).toEqual(['today', 'soon', 'open']);
    expect(out.overdue).toBe(1);
    expect(out.more).toBe(0);
  });

  it('caps the preview and counts the rest', () => {
    const rows = [row('a', '2026-03-10'), row('b', '2026-03-11'), row('c', null), row('d', null)];
    const out = dueAssignments(rows, '2026-03-10', 2);
    expect(out.shown.map((r) => r.id)).toEqual(['a', 'b']);
    expect(out.more).toBe(2);
  });

  it('is empty when nothing is open', () => {
    expect(dueAssignments([], '2026-03-10', 4)).toEqual({ shown: [], overdue: 0, more: 0 });
  });
});
