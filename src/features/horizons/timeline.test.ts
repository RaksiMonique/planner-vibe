import { describe, expect, it } from 'vitest';
import {
  buildLanes,
  collectSubtree,
  columnOf,
  timelineWindow,
  type TimelineGoal,
} from './timeline';

const goal = (over: Partial<TimelineGoal> & { id: string }): TimelineGoal => ({
  title: over.id,
  horizon: 'annual',
  targetDate: null,
  progress: 0,
  status: 'active',
  parentGoalId: null,
  ...over,
});

describe('timelineWindow', () => {
  it('covers today plus eleven months when nothing is dated further', () => {
    const w = timelineWindow([goal({ id: 'a' })], '2026-11-10');
    expect(w.unit).toBe('month');
    expect(w.columns[0]).toBe('2026-11');
    expect(w.columns).toHaveLength(12);
    expect(w.todayColumn).toBe(0);
  });

  it('widens to past and future targets', () => {
    const w = timelineWindow(
      [goal({ id: 'a', targetDate: '2026-03-15' }), goal({ id: 'b', targetDate: '2028-01-01' })],
      '2026-11-10'
    );
    expect(w.unit).toBe('month');
    expect(w.columns[0]).toBe('2026-03');
    expect(w.columns.at(-1)).toBe('2028-01');
    expect(w.todayColumn).toBe(8);
  });

  it('switches to years for long spans', () => {
    const w = timelineWindow([goal({ id: 'a', targetDate: '2040-06-01' })], '2026-11-10');
    expect(w.unit).toBe('year');
    expect(w.columns[0]).toBe('2026');
    expect(w.columns.at(-1)).toBe('2040');
    expect(columnOf(w, '2031-02-02')).toBe(5);
  });
});

describe('buildLanes', () => {
  it('places goals in horizon lanes and keeps undated ones aside', () => {
    const w = timelineWindow([], '2026-11-10');
    const lanes = buildLanes(
      [
        goal({ id: 'life', horizon: 'lifelong' }),
        goal({ id: 'q', horizon: 'quarterly', targetDate: '2026-12-31' }),
        goal({ id: 'm', horizon: 'monthly', targetDate: '2026-11-30' }),
      ],
      w
    );
    expect(lanes.map((l) => l.horizon)).toEqual([
      'lifelong',
      'annual',
      'quarterly',
      'monthly',
      'weekly',
    ]);
    expect(lanes[0].undated.map((g) => g.id)).toEqual(['life']);
    expect(lanes[2].placed[0]).toMatchObject({ column: 1 });
    expect(lanes[3].placed[0]).toMatchObject({ column: 0 });
  });
});

describe('collectSubtree', () => {
  it('returns the root and all descendants breadth first', () => {
    const all = [
      goal({ id: 'root' }),
      goal({ id: 'c1', parentGoalId: 'root' }),
      goal({ id: 'c2', parentGoalId: 'root' }),
      goal({ id: 'g1', parentGoalId: 'c1' }),
      goal({ id: 'other' }),
    ];
    expect(collectSubtree('root', all).map((g) => g.id)).toEqual(['root', 'c1', 'c2', 'g1']);
    expect(collectSubtree('missing', all)).toEqual([]);
  });
});
