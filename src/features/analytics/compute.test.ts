import { describe, expect, it } from 'vitest';
import {
  average,
  formatChange,
  formatHours,
  formatHoursDelta,
  formatPercent,
  goalCompletion,
  habitConsistency,
  lifeBalance,
  moodTrend,
  projectsAndMilestones,
  ratio,
  shareOf,
  summarise,
  timeAllocation,
  type GoalInput,
  type HabitInput,
  type ProjectInput,
} from './compute';
import { buildBuckets } from './period';

const TODAY = '2026-11-11';
const NOV = { start: '2026-11-01', end: '2026-11-30' };
const OCT = { start: '2026-10-01', end: '2026-10-31' };

describe('ratio, average and shareOf', () => {
  it('rounds to whole percentages and refuses to divide by zero', () => {
    expect(ratio(1, 3)).toBe(33);
    expect(ratio(2, 3)).toBe(67);
    expect(ratio(0, 0)).toBeNull();
    expect(ratio(0, 4)).toBe(0);
    expect(average([])).toBe(0);
    expect(average([100, 40, 60])).toBe(67);
    expect(shareOf(50, 200)).toBe(25);
    expect(shareOf(300, 200)).toBe(100);
    expect(shareOf(5, 0)).toBe(0);
  });
});

describe('goalCompletion', () => {
  const goal = (over: Partial<GoalInput>): GoalInput => ({
    id: 'g',
    title: 'Goal',
    horizon: 'monthly',
    status: 'active',
    progress: 0,
    targetDate: null,
    updatedKey: '2026-01-01',
    lifeSegmentId: 's1',
    ...over,
  });

  it('groups goals due in the period by horizon', () => {
    const r = goalCompletion(
      [
        goal({ id: 'a', status: 'achieved', progress: 100, targetDate: '2026-11-15' }),
        goal({ id: 'b', progress: 40, targetDate: '2026-11-30' }),
        goal({ id: 'c', horizon: 'quarterly', progress: 10, targetDate: '2026-12-31' }),
        goal({ id: 'd', horizon: 'annual', progress: 60, targetDate: '2026-11-01' }),
        goal({ id: 'e', progress: 90 }),
      ],
      NOV
    );
    expect(r).toMatchObject({ total: 3, achieved: 1, rate: 33, averageProgress: 67 });
    expect(r.byHorizon).toEqual([
      { horizon: 'annual', total: 1, achieved: 0, averageProgress: 60 },
      { horizon: 'monthly', total: 2, achieved: 1, averageProgress: 70 },
    ]);
    expect(r.isEmpty).toBe(false);
  });

  it('lists goals achieved in the period by last update or target date, by title', () => {
    const r = goalCompletion(
      [
        goal({
          id: 'a',
          title: 'Zebra',
          status: 'achieved',
          targetDate: '2026-03-01',
          updatedKey: '2026-11-03',
        }),
        goal({
          id: 'b',
          title: 'Apple',
          status: 'achieved',
          targetDate: '2026-11-20',
          updatedKey: '2026-12-01',
        }),
        goal({
          id: 'c',
          title: 'Old',
          status: 'achieved',
          targetDate: '2026-03-01',
          updatedKey: '2026-03-02',
        }),
        goal({
          id: 'd',
          title: 'Open',
          status: 'active',
          targetDate: '2026-11-20',
          updatedKey: '2026-11-03',
        }),
      ],
      NOV
    );
    expect(r.achievedInPeriod.map((g) => g.title)).toEqual(['Apple', 'Zebra']);
  });

  it('is empty without goals in the period', () => {
    expect(goalCompletion([], NOV)).toEqual({
      total: 0,
      achieved: 0,
      rate: null,
      averageProgress: 0,
      byHorizon: [],
      achievedInPeriod: [],
      isEmpty: true,
    });
  });
});

describe('habitConsistency', () => {
  const habit = (over: Partial<HabitInput> = {}): HabitInput => ({
    id: 'h',
    name: 'Habit',
    frequency: 'daily',
    target: 1,
    accent: 'sage',
    segmentName: 'Health',
    currentStreak: 0,
    ...over,
  });
  const on = (...dates: string[]) => dates.map((date) => ({ habitId: 'h', date }));

  it('expects one check-in per elapsed day of a daily habit', () => {
    const checkIns = on(
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-05',
      '2026-11-08',
      '2026-11-09',
      '2026-11-11'
    );
    const r = habitConsistency([habit({ currentStreak: 1 })], checkIns, NOV, TODAY, 1);
    expect(r.rows[0]).toMatchObject({ count: 7, achieved: 7, expected: 11, rate: 64 });
    expect(r).toMatchObject({ achieved: 7, expected: 11, rate: 64, isEmpty: false });
  });

  it('counts weekly targets per week, capping over-achievement', () => {
    // Weeks start on Monday; 1 November 2026 is a Sunday, so the first week
    // runs 26 Oct – 1 Nov and a check-in before the period counts in it.
    const checkIns = on('2026-10-27', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04');
    const r = habitConsistency(
      [habit({ frequency: 'weekly', target: 2 })],
      checkIns,
      NOV,
      TODAY,
      1
    );
    expect(r.rows[0]).toMatchObject({ count: 4, achieved: 4, expected: 6, rate: 67 });
  });

  it('expects nothing from a period that has not started', () => {
    const r = habitConsistency([habit()], [], { start: '2026-12-01', end: '2026-12-31' }, TODAY, 1);
    expect(r.rows[0]).toMatchObject({ expected: 0, achieved: 0, rate: null });
    expect(r.rate).toBeNull();
    expect(r.isEmpty).toBe(false);
  });

  it('uses the whole period once it is over', () => {
    const r = habitConsistency([habit()], on('2026-10-05'), OCT, TODAY, 1);
    expect(r.rows[0]).toMatchObject({ count: 1, expected: 31, achieved: 1, rate: 3 });
  });

  it('counts a check-in value above one as that many, within the target', () => {
    const r = habitConsistency(
      [habit({ frequency: 'monthly', target: 4 })],
      [{ habitId: 'h', date: '2026-11-02', value: 6 }],
      NOV,
      TODAY,
      1
    );
    expect(r.rows[0]).toMatchObject({ count: 6, achieved: 4, expected: 4, rate: 100 });
  });

  it('sorts by rate with the best first and is empty without habits', () => {
    const r = habitConsistency(
      [habit({ id: 'a', name: 'A' }), habit({ id: 'b', name: 'B' })],
      [{ habitId: 'b', date: '2026-11-10' }],
      NOV,
      TODAY,
      1
    );
    expect(r.rows.map((x) => x.name)).toEqual(['B', 'A']);
    expect(habitConsistency([], [], NOV, TODAY, 1)).toMatchObject({
      rows: [],
      rate: null,
      isEmpty: true,
    });
  });
});

describe('timeAllocation', () => {
  const segments = [
    { id: 's1', name: 'Faith', accent: 'burgundy' as const },
    { id: 's2', name: 'Health', accent: 'sage' as const },
  ];

  it('names segments, computes the delta and sorts by logged time', () => {
    const r = timeAllocation(
      [
        { key: 's1', planned: 120, actual: 60, delta: -60 },
        { key: 's2', planned: 30, actual: 90, delta: 60 },
        { key: 's3', planned: 0, actual: 15, delta: 15 },
        { key: 's4', planned: 0, actual: 0, delta: 0 },
      ],
      segments
    );
    expect(r.rows.map((x) => x.name)).toEqual(['Health', 'Faith', 'Unknown segment']);
    expect(r.rows[1]).toMatchObject({ accent: 'burgundy', planned: 120, actual: 60, delta: -60 });
    expect(r).toMatchObject({ plannedTotal: 150, actualTotal: 165, delta: 15, isEmpty: false });
  });

  it('is empty without minutes', () => {
    expect(timeAllocation([], segments).isEmpty).toBe(true);
    expect(timeAllocation([{ key: 's1', planned: 0, actual: 0, delta: 0 }], segments).isEmpty).toBe(
      true
    );
  });
});

describe('projectsAndMilestones', () => {
  const project = (over: Partial<ProjectInput>): ProjectInput => ({
    id: 'p',
    title: 'Project',
    status: 'active',
    progress: 0,
    accent: 'sage',
    segmentName: 'Health',
    dueDate: null,
    ...over,
  });

  it('keeps active projects furthest along first and flags overdue milestones', () => {
    const r = projectsAndMilestones(
      [
        project({ id: 'p1', title: 'B', progress: 40 }),
        project({ id: 'p2', title: 'A', status: 'planned', progress: 40 }),
        project({ id: 'p3', title: 'C', status: 'on_hold', progress: 80 }),
        project({ id: 'p4', title: 'Done', status: 'done', progress: 100 }),
        project({ id: 'p5', title: 'Archived', status: 'archived', progress: 10 }),
      ],
      [
        {
          id: 'm1',
          title: 'Late',
          dueDate: '2026-11-02',
          done: false,
          parentTitle: 'B',
          href: '/projects/p1',
        },
        {
          id: 'm2',
          title: 'Later',
          dueDate: '2026-11-01',
          done: false,
          parentTitle: null,
          href: null,
        },
        {
          id: 'm3',
          title: 'Soon',
          dueDate: '2026-11-20',
          done: false,
          parentTitle: null,
          href: null,
        },
        {
          id: 'm4',
          title: 'Finished',
          dueDate: '2026-11-05',
          done: true,
          parentTitle: null,
          href: null,
        },
      ],
      TODAY
    );
    expect(r.projects.map((p) => p.title)).toEqual(['C', 'A', 'B']);
    expect(r).toMatchObject({ milestonesTotal: 4, milestonesDone: 1, milestoneRate: 25 });
    expect(r.overdue.map((m) => m.title)).toEqual(['Later', 'Late']);
    expect(r.isEmpty).toBe(false);
  });

  it('is empty without active projects or milestones', () => {
    const r = projectsAndMilestones([project({ status: 'done' })], [], TODAY);
    expect(r).toMatchObject({
      projects: [],
      milestonesTotal: 0,
      milestoneRate: null,
      isEmpty: true,
    });
  });
});

describe('moodTrend', () => {
  it('averages mood and energy per bucket and finds the peak', () => {
    const buckets = buildBuckets('quarter', '2026-10-01', '2026-12-31', 1);
    const r = moodTrend(
      [
        { date: '2026-10-01', mood: 4, energy: 3 },
        { date: '2026-10-03', mood: 5, energy: 2 },
        { date: '2026-10-06', mood: 2, energy: 4 },
      ],
      buckets
    );
    expect(r).toMatchObject({ entries: 3, averageMood: 3.7, averageEnergy: 3, isEmpty: false });
    expect(r.buckets[0]).toMatchObject({ key: '2026-10-01', mood: 4.5, energy: 2.5, entries: 2 });
    expect(r.buckets[1]).toMatchObject({ mood: 2, energy: 4, entries: 1 });
    expect(r.buckets[2]).toMatchObject({ mood: null, energy: null, entries: 0 });
    expect(r.peakKey).toBe('2026-10-01');
  });

  it('is empty without entries but keeps a column per day', () => {
    const r = moodTrend([], buildBuckets('month', NOV.start, NOV.end, 1));
    expect(r).toMatchObject({
      entries: 0,
      averageMood: null,
      averageEnergy: null,
      peakKey: null,
      isEmpty: true,
    });
    expect(r.buckets).toHaveLength(30);
  });
});

describe('summarise', () => {
  it('counts each measure in the current and previous period and the change', () => {
    const r = summarise(
      {
        tasksDone: ['2026-11-01', '2026-11-30', '2026-10-15', '2026-12-01'],
        events: ['2026-10-02', '2026-10-03'],
        journalEntries: ['2026-11-11'],
        reviewsCompleted: [],
      },
      NOV,
      OCT
    );
    expect(r.current).toEqual({ tasksDone: 2, events: 0, journalEntries: 1, reviewsCompleted: 0 });
    expect(r.previous).toEqual({ tasksDone: 1, events: 2, journalEntries: 0, reviewsCompleted: 0 });
    expect(r.change).toEqual({ tasksDone: 1, events: -2, journalEntries: 1, reviewsCompleted: 0 });
  });

  it('is all zeros without activity', () => {
    const r = summarise(
      { tasksDone: [], events: [], journalEntries: [], reviewsCompleted: [] },
      NOV,
      OCT
    );
    expect(r.current).toEqual({ tasksDone: 0, events: 0, journalEntries: 0, reviewsCompleted: 0 });
    expect(r.change).toEqual(r.current);
  });
});

describe('lifeBalance', () => {
  const faith = { id: 'a', name: 'Faith', accent: 'burgundy' as const, weight: 3 };
  const health = { id: 'b', name: 'Health', accent: 'sage' as const, weight: 1 };
  const home = { id: 'c', name: 'Home', accent: 'beige' as const, weight: 1 };

  it('normalises weights, shares each measure and names the widest gap', () => {
    const r = lifeBalance(
      [faith, health, home],
      { a: 1, b: 3, c: 1 },
      { a: 60, b: 60 },
      { a: 2, zzz: 9 }
    );
    expect(r.totals).toEqual({ tasks: 5, minutes: 120, goals: 2 });
    expect(r.rows[0]).toMatchObject({
      name: 'Faith',
      weightShare: 60,
      taskShare: 20,
      timeShare: 50,
      goalShare: 100,
      attentionShare: 57,
      gap: -3,
    });
    expect(r.rows[1]).toMatchObject({
      weightShare: 20,
      taskShare: 60,
      timeShare: 50,
      goalShare: 0,
      attentionShare: 37,
      gap: 17,
    });
    expect(r.rows[2]).toMatchObject({ weightShare: 20, attentionShare: 7, gap: -13 });
    expect(r.note).toBe(
      'Widest gap: Health receives 37% of your attention (open tasks, logged time and goals) against a weight share of 20%.'
    );
    expect(r.isEmpty).toBe(false);
  });

  it('skips measures without data and notes when attention follows the weights', () => {
    const r = lifeBalance([{ ...faith, weight: 1 }, health], { a: 1, b: 1 }, {}, {});
    expect(r.rows[0]).toMatchObject({
      weightShare: 50,
      taskShare: 50,
      timeShare: null,
      goalShare: null,
      attentionShare: 50,
      gap: 0,
    });
    expect(r.note).toBe('Your attention is spread close to the weights you gave each segment.');
  });

  it('is empty without any activity or segments', () => {
    const r = lifeBalance([faith, health], {}, {}, {});
    expect(r.isEmpty).toBe(true);
    expect(r.note).toBeNull();
    expect(r.rows[0]).toMatchObject({ weightShare: 75, attentionShare: null, gap: null });
    expect(lifeBalance([], { a: 1 }, {}, {}).isEmpty).toBe(true);
  });
});

describe('formatting', () => {
  it('formats hours, deltas, percentages and changes', () => {
    expect(formatHours(0)).toBe('0 h');
    expect(formatHours(90)).toBe('1.5 h');
    expect(formatHours(720)).toBe('12 h');
    expect(formatHours(125)).toBe('2.1 h');
    expect(formatHoursDelta(0)).toBe('On plan');
    expect(formatHoursDelta(90)).toBe('+1.5 h');
    expect(formatHoursDelta(-30)).toBe('−0.5 h');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(42)).toBe('42%');
    expect(formatChange(3)).toBe('+3');
    expect(formatChange(-2)).toBe('−2');
    expect(formatChange(0)).toBe('no change');
  });
});
