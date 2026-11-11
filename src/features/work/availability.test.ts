import { describe, expect, it } from 'vitest';
import {
  cycleIndex,
  dateKeysBetween,
  deriveWorkDays,
  describeCycle,
  expandPattern,
  shiftCalendarItems,
  type PatternSource,
  type ShiftSource,
  type WorkSources,
} from './availability';

const twoOnTwoOff: PatternSource = {
  id: 'p1',
  name: 'Rota',
  anchorDate: '2026-03-02', // a Monday
  cycle: [
    { kind: 'work', label: 'Day', start: '07:00', end: '19:00' },
    { kind: 'work', label: 'Day', start: '07:00', end: '19:00' },
    { kind: 'off' },
    { kind: 'off' },
  ],
  accent: 'sage',
  isActive: true,
};

const empty: WorkSources = { patterns: [], shifts: [], leave: [], holidays: [] };
const manual = (over: Partial<ShiftSource>): ShiftSource => ({
  id: 's1',
  date: '2026-03-02',
  kind: 'work',
  label: null,
  startTime: null,
  endTime: null,
  patternId: null,
  ...over,
});

describe('dateKeysBetween', () => {
  it('is inclusive at both ends and empty when reversed', () => {
    expect(dateKeysBetween('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(dateKeysBetween('2026-03-02', '2026-03-02')).toEqual(['2026-03-02']);
    expect(dateKeysBetween('2026-03-03', '2026-03-02')).toEqual([]);
  });
});

describe('expandPattern', () => {
  it('maps each date to its cycle day from the anchor', () => {
    const days = expandPattern(twoOnTwoOff, '2026-03-02', '2026-03-07');
    expect(days.map((d) => d.index)).toEqual([0, 1, 2, 3, 0, 1]);
    expect(days[0].day.kind).toBe('work');
    expect(days[2].day.kind).toBe('off');
  });

  it('uses a positive modulo for dates before the anchor', () => {
    const days = expandPattern(twoOnTwoOff, '2026-02-26', '2026-03-01');
    // 26 Feb is four days before the anchor, so it is day 0 again.
    expect(days.map((d) => d.index)).toEqual([0, 1, 2, 3]);
    expect(cycleIndex('2026-03-02', '2026-03-01', 4)).toBe(3);
    expect(cycleIndex('2026-03-02', '2026-02-01', 4)).toBe(3);
  });

  it('returns nothing for an empty cycle', () => {
    expect(expandPattern({ ...twoOnTwoOff, cycle: [] }, '2026-03-02', '2026-03-05')).toEqual([]);
  });
});

describe('deriveWorkDays', () => {
  it('returns one entry per date with pattern shifts and status', () => {
    const days = deriveWorkDays({ ...empty, patterns: [twoOnTwoOff] }, '2026-03-02', '2026-03-05');
    expect(days.map((d) => d.date)).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
    ]);
    expect(days.map((d) => d.status)).toEqual(['working', 'working', 'off', 'off']);
    expect(days[0].shifts).toEqual([
      {
        kind: 'work',
        label: 'Day',
        start: '07:00',
        end: '19:00',
        source: 'pattern',
        patternId: 'p1',
        accent: 'sage',
      },
    ]);
    expect(days[2].shifts).toEqual([]);
  });

  it('ignores inactive patterns and overlays several active ones', () => {
    const onCall: PatternSource = {
      id: 'p2',
      name: 'Pager',
      anchorDate: '2026-03-04',
      cycle: [
        { kind: 'on_call', label: 'Pager' },
        { kind: 'off' },
        { kind: 'off' },
        { kind: 'off' },
      ],
      accent: 'coral',
      isActive: true,
    };
    const days = deriveWorkDays(
      { ...empty, patterns: [twoOnTwoOff, onCall, { ...twoOnTwoOff, id: 'p3', isActive: false }] },
      '2026-03-02',
      '2026-03-05'
    );
    expect(days[0].shifts).toHaveLength(1);
    expect(days[2]).toMatchObject({ status: 'on_call' });
    expect(days[2].shifts[0]).toMatchObject({ kind: 'on_call', patternId: 'p2', accent: 'coral' });
  });

  it('is on call only when no work shift is present', () => {
    const days = deriveWorkDays(
      {
        ...empty,
        shifts: [
          manual({ id: 'a', kind: 'on_call' }),
          manual({ id: 'b', kind: 'work', label: 'Cover' }),
        ],
      },
      '2026-03-02',
      '2026-03-02'
    );
    expect(days[0].status).toBe('working');
    expect(days[0].shifts.map((s) => s.label)).toEqual(['On call', 'Cover']);
  });

  it('lets manual shifts replace the pattern for that date only', () => {
    const days = deriveWorkDays(
      {
        ...empty,
        patterns: [twoOnTwoOff],
        shifts: [
          manual({
            date: '2026-03-04',
            kind: 'work',
            label: 'Extra',
            startTime: '09:00:00',
            endTime: '13:00:00',
          }),
          manual({ id: 's2', date: '2026-03-02', kind: 'off' }),
        ],
      },
      '2026-03-02',
      '2026-03-05'
    );
    expect(days[0]).toMatchObject({ status: 'off' });
    expect(days[0].shifts).toEqual([
      {
        kind: 'off',
        label: 'Off',
        source: 'manual',
        id: 's2',
        start: undefined,
        end: undefined,
        patternId: undefined,
      },
    ]);
    expect(days[2]).toMatchObject({ status: 'working' });
    expect(days[2].shifts[0]).toMatchObject({
      label: 'Extra',
      start: '09:00',
      end: '13:00',
      source: 'manual',
      id: 's1',
    });
    expect(days[1].shifts[0].source).toBe('pattern');
  });

  it('puts leave above shifts, whatever the leave status', () => {
    const days = deriveWorkDays(
      {
        ...empty,
        patterns: [twoOnTwoOff],
        shifts: [manual({ date: '2026-03-03' })],
        leave: [
          { startDate: '2026-03-03', endDate: '2026-03-04', kind: 'annual', status: 'planned' },
        ],
      },
      '2026-03-02',
      '2026-03-05'
    );
    expect(days.map((d) => d.status)).toEqual(['working', 'leave', 'leave', 'off']);
    expect(days[1]).toEqual({
      date: '2026-03-03',
      status: 'leave',
      shifts: [],
      leave: { kind: 'annual', status: 'planned' },
    });
  });

  it('lets a public holiday win over everything', () => {
    const days = deriveWorkDays(
      {
        ...empty,
        patterns: [twoOnTwoOff],
        shifts: [manual({ date: '2026-03-02' })],
        leave: [{ startDate: '2026-03-02', endDate: '2026-03-02', kind: 'sick', status: 'taken' }],
        holidays: [{ date: '2026-03-02', name: 'Founders Day' }],
      },
      '2026-03-02',
      '2026-03-02'
    );
    expect(days[0]).toEqual({
      date: '2026-03-02',
      status: 'holiday',
      shifts: [],
      holiday: { name: 'Founders Day' },
    });
  });
});

describe('describeCycle', () => {
  it('summarises runs of days', () => {
    expect(describeCycle(twoOnTwoOff.cycle)).toBe('2 on, 2 off');
    expect(describeCycle([{ kind: 'on_call' }, { kind: 'off' }])).toBe('1 on call, 1 off');
    expect(describeCycle([])).toBe('No days yet');
  });
});

describe('shiftCalendarItems', () => {
  it('turns timed shifts into instants in the zone and untimed ones into all-day chips', () => {
    const days = deriveWorkDays(
      {
        ...empty,
        patterns: [twoOnTwoOff],
        shifts: [manual({ date: '2026-03-04', label: 'Cover' })],
      },
      '2026-03-02',
      '2026-03-04'
    );
    const items = shiftCalendarItems(days, 'America/Jamaica', 'seg');
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      type: 'shift',
      allDay: false,
      start: '2026-03-02T12:00:00.000Z',
      end: '2026-03-03T00:00:00.000Z',
      accent: 'sage',
      segmentId: 'seg',
      recurring: true,
      sourceId: '2026-03-02',
    });
    expect(items[2]).toMatchObject({
      allDay: true,
      start: '2026-03-04',
      end: null,
      title: 'Cover',
      recurring: false,
    });
  });

  it('rolls an overnight shift to the next day and skips days off', () => {
    const night: PatternSource = {
      ...twoOnTwoOff,
      cycle: [{ kind: 'work', label: 'Night', start: '22:00', end: '06:00' }, { kind: 'off' }],
    };
    const items = shiftCalendarItems(
      deriveWorkDays({ ...empty, patterns: [night] }, '2026-03-02', '2026-03-03'),
      'UTC',
      null
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      start: '2026-03-02T22:00:00.000Z',
      end: '2026-03-03T06:00:00.000Z',
    });
  });
});
