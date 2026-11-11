import { describe, expect, it } from 'vitest';
import {
  actualInterval,
  analyseTime,
  analyticsHref,
  formatDelta,
  overlapMinutes,
  resolveRange,
  shareOf,
} from './analytics';

const tz = 'America/Jamaica'; // UTC-5, no DST
const todayKey = '2026-11-10'; // a Tuesday

describe('resolveRange', () => {
  it('defaults to the current week starting Monday', () => {
    const r = resolveRange({}, todayKey, tz, 1);
    expect(r.range).toBe('week');
    expect(r.startKey).toBe('2026-11-09');
    expect(r.endKey).toBe('2026-11-15');
    expect(r.dayKeys).toHaveLength(7);
    expect(r.from.toISOString()).toBe('2026-11-09T05:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-11-16T05:00:00.000Z');
    expect(r.prevStartKey).toBe('2026-11-02');
    expect(r.nextStartKey).toBe('2026-11-16');
    expect(r.label).toBe('9 Nov – 15 Nov 2026');
  });
  it('honours the week start preference and snaps any day to its week', () => {
    const r = resolveRange({ range: 'week', start: '2026-11-12' }, todayKey, tz, 0);
    expect(r.startKey).toBe('2026-11-08');
    expect(r.endKey).toBe('2026-11-14');
  });
  it('resolves a month with previous and next links', () => {
    const r = resolveRange({ range: 'month', start: '2026-11-20' }, todayKey, tz, 1);
    expect(r.range).toBe('month');
    expect(r.startKey).toBe('2026-11-01');
    expect(r.endKey).toBe('2026-11-30');
    expect(r.dayKeys).toHaveLength(30);
    expect(r.prevStartKey).toBe('2026-10-01');
    expect(r.nextStartKey).toBe('2026-12-01');
    expect(r.label).toBe('November 2026');
    expect(r.to.toISOString()).toBe('2026-12-01T05:00:00.000Z');
  });
  it('falls back to today for a missing or malformed start', () => {
    expect(resolveRange({ start: 'yesterday' }, todayKey, tz, 1).startKey).toBe('2026-11-09');
    expect(resolveRange({ start: '2026-13-40' }, todayKey, tz, 1).startKey).toBe('2026-11-09');
    expect(resolveRange({ start: ['2026-11-02'] }, todayKey, tz, 1).startKey).toBe('2026-11-09');
  });
  it('builds hrefs with the range and start', () => {
    expect(analyticsHref('week')).toBe('/time/analytics?range=week');
    expect(analyticsHref('month', '2026-12-01')).toBe(
      '/time/analytics?range=month&start=2026-12-01'
    );
  });
});

describe('intervals', () => {
  const from = new Date('2026-11-09T05:00:00Z');
  const to = new Date('2026-11-16T05:00:00Z');
  it('clips to the range', () => {
    expect(
      overlapMinutes(new Date('2026-11-09T04:00:00Z'), new Date('2026-11-09T06:00:00Z'), from, to)
    ).toBe(60);
    expect(
      overlapMinutes(new Date('2026-11-16T05:00:00Z'), new Date('2026-11-16T06:00:00Z'), from, to)
    ).toBe(0);
  });
  it('prefers the stored duration, then the end time, then the clock', () => {
    const base = { lifeSegmentId: 's', projectId: null, taskId: null };
    const now = new Date('2026-11-09T13:20:00Z');
    expect(
      actualInterval(
        {
          ...base,
          startedAt: '2026-11-09T13:00:00Z',
          endedAt: '2026-11-09T14:00:00Z',
          durationMinutes: 45,
        },
        now
      ).end.toISOString()
    ).toBe('2026-11-09T13:45:00.000Z');
    expect(
      actualInterval(
        {
          ...base,
          startedAt: '2026-11-09T13:00:00Z',
          endedAt: '2026-11-09T14:00:00Z',
          durationMinutes: null,
        },
        now
      ).end.toISOString()
    ).toBe('2026-11-09T14:00:00.000Z');
    expect(
      actualInterval(
        { ...base, startedAt: '2026-11-09T13:00:00Z', endedAt: null, durationMinutes: null },
        now
      ).end.toISOString()
    ).toBe('2026-11-09T13:20:00.000Z');
  });
});

describe('analyseTime', () => {
  const range = resolveRange({}, todayKey, tz, 1);
  const planned = [
    // Monday 09:00–11:00 local, deep work on project p1 for task t1
    {
      start: '2026-11-09T14:00:00Z',
      end: '2026-11-09T16:00:00Z',
      activityType: 'deep_work' as const,
      segmentId: 'work',
      projectId: 'p1',
      taskId: 't1',
    },
    // Tuesday 23:00 – Wednesday 01:00 local: crosses midnight
    {
      start: '2026-11-11T04:00:00Z',
      end: '2026-11-11T06:00:00Z',
      activityType: 'light_work' as const,
      segmentId: 'home',
      projectId: null,
      taskId: null,
    },
    // Entirely outside the range
    {
      start: '2026-11-20T14:00:00Z',
      end: '2026-11-20T15:00:00Z',
      activityType: 'break' as const,
      segmentId: 'work',
      projectId: null,
      taskId: null,
    },
  ];
  const actual = [
    // Monday: 90 minutes on t1
    {
      startedAt: '2026-11-09T14:00:00Z',
      endedAt: '2026-11-09T15:30:00Z',
      durationMinutes: 90,
      lifeSegmentId: 'work',
      projectId: 'p1',
      taskId: 't1',
    },
    // Monday: 30 minutes on t2, no project
    {
      startedAt: '2026-11-09T20:00:00Z',
      endedAt: null,
      durationMinutes: 30,
      lifeSegmentId: 'work',
      projectId: null,
      taskId: 't2',
    },
    // Thursday: 45 minutes at home, no task
    {
      startedAt: '2026-11-12T20:00:00Z',
      endedAt: '2026-11-12T20:45:00Z',
      durationMinutes: null,
      lifeSegmentId: 'home',
      projectId: null,
      taskId: null,
    },
  ];
  const result = analyseTime(planned, actual, range, tz, { now: new Date('2026-11-13T00:00:00Z') });

  it('totals planned and actual minutes inside the range', () => {
    expect(result.plannedTotal).toBe(240);
    expect(result.actualTotal).toBe(165);
    expect(result.delta).toBe(-75);
    expect(result.isEmpty).toBe(false);
  });
  it('compares by segment with a delta, most logged first', () => {
    expect(result.bySegment).toEqual([
      { key: 'work', planned: 120, actual: 120, delta: 0 },
      { key: 'home', planned: 120, actual: 45, delta: -75 },
    ]);
  });
  it('compares by project, folding unassigned time into "none"', () => {
    expect(result.byProject).toEqual([
      { key: 'p1', planned: 120, actual: 90, delta: -30 },
      { key: 'none', planned: 120, actual: 75, delta: -45 },
    ]);
  });
  it('sums planned minutes per activity type from blocks only', () => {
    expect(result.byActivity).toEqual([
      { key: 'deep_work', minutes: 120 },
      { key: 'light_work', minutes: 120 },
    ]);
  });
  it('buckets minutes by local day and splits a block that crosses midnight', () => {
    const byKey = Object.fromEntries(result.byDay.map((d) => [d.key, d]));
    expect(result.byDay.map((d) => d.key)).toEqual(range.dayKeys);
    expect(byKey['2026-11-09']).toEqual({ key: '2026-11-09', planned: 120, actual: 120 });
    expect(byKey['2026-11-10'].planned).toBe(60);
    expect(byKey['2026-11-11'].planned).toBe(60);
    expect(byKey['2026-11-12'].actual).toBe(45);
    expect(result.daysLogged).toBe(2);
    expect(result.busiestDay?.key).toBe('2026-11-09');
  });
  it('ranks tasks by logged time and respects the limit', () => {
    expect(result.topTasks).toEqual([
      { key: 't1', minutes: 90 },
      { key: 't2', minutes: 30 },
    ]);
    expect(
      analyseTime(planned, actual, range, tz, {
        now: new Date('2026-11-13T00:00:00Z'),
        topTasks: 1,
      }).topTasks
    ).toEqual([{ key: 't1', minutes: 90 }]);
  });
  it('reports an empty range', () => {
    const empty = analyseTime([], [], range, tz);
    expect(empty.isEmpty).toBe(true);
    expect(empty.byDay).toHaveLength(7);
    expect(empty.busiestDay).toBeNull();
  });
});

describe('display helpers', () => {
  it('scales a bar to the largest value', () => {
    expect(shareOf(30, 120)).toBe(25);
    expect(shareOf(0, 120)).toBe(0);
    expect(shareOf(10, 0)).toBe(0);
    expect(shareOf(200, 120)).toBe(100);
  });
  it('formats deltas with a sign', () => {
    expect(formatDelta(90)).toBe('+1 h 30 min');
    expect(formatDelta(-45)).toBe('−45 min');
    expect(formatDelta(0)).toBe('On plan');
  });
});
