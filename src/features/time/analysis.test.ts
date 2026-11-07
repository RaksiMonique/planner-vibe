import { describe, expect, it } from 'vitest';
import {
  actualMinutes,
  analyseRange,
  clippedMinutes,
  dayKeysBetween,
  plannedVsActualPercent,
} from './analysis';

const tz = 'America/Jamaica'; // UTC-5, no DST
const from = new Date('2026-11-02T05:00:00Z'); // Monday 00:00 local
const to = new Date('2026-11-09T05:00:00Z');

describe('clippedMinutes and actualMinutes', () => {
  it('clips to the range', () => {
    expect(clippedMinutes('2026-11-01T23:00:00Z', '2026-11-02T06:00:00Z', from, to)).toBe(60);
    expect(clippedMinutes('2026-11-10T00:00:00Z', '2026-11-10T01:00:00Z', from, to)).toBe(0);
  });
  it('uses the stored duration, the end time, or the clock for a running entry', () => {
    const base = { lifeSegmentId: 's', projectId: null };
    expect(
      actualMinutes({
        ...base,
        startedAt: '2026-11-02T13:00:00Z',
        endedAt: '2026-11-02T14:00:00Z',
        durationMinutes: 45,
      })
    ).toBe(45);
    expect(
      actualMinutes({
        ...base,
        startedAt: '2026-11-02T13:00:00Z',
        endedAt: '2026-11-02T14:00:00Z',
        durationMinutes: null,
      })
    ).toBe(60);
    expect(
      actualMinutes(
        { ...base, startedAt: '2026-11-02T13:00:00Z', endedAt: null, durationMinutes: null },
        new Date('2026-11-02T13:20:00Z')
      )
    ).toBe(20);
  });
});

describe('dayKeysBetween', () => {
  it('lists the seven local days of the week', () => {
    const keys = dayKeysBetween(from, to, tz);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe('2026-11-02');
    expect(keys[6]).toBe('2026-11-08');
  });
});

describe('analyseRange', () => {
  it('sums planned and actual by activity, segment, project and day', () => {
    const planned = [
      {
        start: '2026-11-02T13:00:00Z',
        end: '2026-11-02T15:00:00Z',
        activityType: 'deep_work' as const,
        segmentId: 'work',
        projectId: 'p1',
      },
      {
        start: '2026-11-03T13:00:00Z',
        end: '2026-11-03T13:30:00Z',
        activityType: 'break' as const,
        segmentId: 'home',
        projectId: null,
      },
      // crosses local midnight: 23:30 to 00:30 on 3/4 Nov local = 04:30Z to 05:30Z
      {
        start: '2026-11-04T04:30:00Z',
        end: '2026-11-04T05:30:00Z',
        activityType: 'light_work' as const,
        segmentId: 'work',
        projectId: null,
      },
    ];
    const actual = [
      {
        startedAt: '2026-11-02T13:00:00Z',
        endedAt: '2026-11-02T14:30:00Z',
        durationMinutes: 90,
        lifeSegmentId: 'work',
        projectId: 'p1',
        activityType: 'deep_work' as const,
      },
      {
        startedAt: '2026-11-03T20:00:00Z',
        endedAt: null,
        durationMinutes: null,
        lifeSegmentId: 'home',
        projectId: null,
      },
    ];
    const r = analyseRange(planned, actual, from, to, tz, new Date('2026-11-03T20:45:00Z'));
    expect(r.plannedTotal).toBe(210);
    expect(r.planned.byActivity).toEqual({ deep_work: 120, break: 30, light_work: 60 });
    expect(r.planned.bySegment).toEqual({ work: 180, home: 30 });
    expect(r.planned.byProject).toEqual({ p1: 120, none: 90 });
    expect(r.actualTotal).toBe(135);
    expect(r.actual.byActivity).toEqual({ deep_work: 90, unlinked: 45 });
    const byKey = Object.fromEntries(r.byDay.map((d) => [d.key, d]));
    expect(byKey['2026-11-02']).toEqual({ key: '2026-11-02', planned: 120, actual: 90 });
    expect(byKey['2026-11-03'].planned).toBe(60); // 30 break + 30 before midnight
    expect(byKey['2026-11-04'].planned).toBe(30); // the half hour after midnight
    expect(byKey['2026-11-03'].actual).toBe(45);
  });
});

describe('plannedVsActualPercent', () => {
  it('caps at 100 and handles no plan', () => {
    expect(plannedVsActualPercent(120, 60)).toBe(50);
    expect(plannedVsActualPercent(60, 120)).toBe(100);
    expect(plannedVsActualPercent(0, 0)).toBe(0);
    expect(plannedVsActualPercent(0, 30)).toBe(100);
  });
});
