import { describe, expect, it } from 'vitest';
import {
  CORE_PROMPTS,
  REVIEW_TEMPLATES,
  answeredCount,
  periodFor,
  periodLabel,
  reviewStatus,
  shiftPeriod,
} from './templates';

const wednesday = new Date(2026, 10, 4); // Wed 4 Nov 2026

describe('review templates', () => {
  it('every period review carries the six spec prompts', () => {
    const specLabels = [
      'What went well?',
      'What did not go well?',
      'What did I accomplish?',
      'What needs improvement?',
      'Which goals progressed?',
      'What should I prioritise next?',
    ];
    expect(CORE_PROMPTS.map((p) => p.label)).toEqual(specLabels);
    for (const kind of ['weekly', 'monthly', 'quarterly', 'annual'] as const) {
      const labels = REVIEW_TEMPLATES[kind].prompts.map((p) => p.label);
      for (const l of specLabels) expect(labels).toContain(l);
      expect(labels.length).toBeGreaterThan(specLabels.length);
    }
    const ids = REVIEW_TEMPLATES.weekly.prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('computes periods from the user week start', () => {
    const w = periodFor('weekly', wednesday, 1);
    expect([w.start.getDate(), w.end.getDate()]).toEqual([2, 8]);
    const sun = periodFor('weekly', wednesday, 0);
    expect(sun.start.getDate()).toBe(1);
    const m = periodFor('monthly', wednesday, 1);
    expect([m.start.getMonth(), m.end.getDate()]).toEqual([10, 30]);
    const q = periodFor('quarterly', wednesday, 1);
    expect([q.start.getMonth(), q.end.getMonth()]).toEqual([9, 11]);
    const y = periodFor('annual', wednesday, 1);
    expect([y.start.getMonth(), y.end.getMonth(), y.end.getDate()]).toEqual([0, 11, 31]);
  });

  it('shifts and labels periods', () => {
    const { start, end } = periodFor('quarterly', wednesday, 1);
    expect(periodLabel('quarterly', start, end)).toBe('Q4 2026');
    expect(shiftPeriod('quarterly', start, -1).getMonth()).toBe(6);
    expect(periodLabel('weekly', periodFor('weekly', wednesday, 1).start, end)).toBe(
      'Week of 2 Nov 2026'
    );
    expect(periodLabel('monthly', start, end)).toBe('October 2026');
    expect(shiftPeriod('annual', start, 1).getFullYear()).toBe(2027);
  });

  it('derives status from answers and completion', () => {
    const prompts = REVIEW_TEMPLATES.goal.prompts;
    expect(reviewStatus(null, prompts)).toBe('not_started');
    expect(reviewStatus({ answers: {}, completedAt: null }, prompts)).toBe('not_started');
    expect(reviewStatus({ answers: { went_well: 'x' }, completedAt: null }, prompts)).toBe(
      'in_progress'
    );
    expect(reviewStatus({ answers: {}, completedAt: new Date() }, prompts)).toBe('complete');
    expect(answeredCount({ went_well: 'a', not_well: '  ', unknown: 'z' }, prompts)).toBe(1);
  });
});
