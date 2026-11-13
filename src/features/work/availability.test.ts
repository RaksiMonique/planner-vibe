import { describe, expect, it } from 'vitest';
import {
  cycleIndex,
  dateKeysBetween,
  deriveWorkDays,
  describeCycle,
  describeShift,
  expandPattern,
  expandShift,
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
  endDate: null,
  repeatWeeks: 0,
  repeatUntil: null,
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

describe('expandShift', () => {
  it('is the day itself for a one-off, and nothing outside the range', () => {
    expect(expandShift(manual({}), '2026-03-01', '2026-03-31')).toEqual(['2026-03-02']);
    expect(expandShift(manual({}), '2026-03-03', '2026-03-31')).toEqual([]);
  });

  it('covers a block of days, clipped to the range', () => {
    const block = manual({ date: '2026-03-30', endDate: '2026-04-02' });
    expect(expandShift(block, '2026-03-01', '2026-03-31')).toEqual(['2026-03-30', '2026-03-31']);
    expect(expandShift(block, '2026-04-01', '2026-04-30')).toEqual(['2026-04-01', '2026-04-02']);
  });

  it('brings a block back every week until the end date', () => {
    const weekly = manual({
      date: '2026-03-02',
      endDate: '2026-03-04',
      repeatWeeks: 1,
      repeatUntil: '2026-03-17',
    });
    expect(expandShift(weekly, '2026-03-01', '2026-03-31')).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-16',
      '2026-03-17', // the end date is the last day produced
    ]);
  });

  it('keeps the weekday when the range starts long after the first block', () => {
    const fortnightly = manual({ date: '2026-03-02', repeatWeeks: 2 });
    // 2 Mar 2026 is a Monday; every other Monday a year later is 1, 15 and 29 Mar 2027.
    expect(expandShift(fortnightly, '2027-03-01', '2027-03-31')).toEqual([
      '2027-03-01',
      '2027-03-15',
      '2027-03-29',
    ]);
  });

  it('includes a block that began before the range', () => {
    const weekly = manual({ date: '2026-03-02', endDate: '2026-03-04', repeatWeeks: 1 });
    expect(expandShift(weekly, '2026-03-10', '2026-03-11')).toEqual(['2026-03-10', '2026-03-11']);
  });

  it('is empty once the end date has passed', () => {
    const ended = manual({ date: '2026-03-02', repeatWeeks: 1, repeatUntil: '2026-03-20' });
    expect(expandShift(ended, '2026-04-01', '2026-04-30')).toEqual([]);
  });
});

describe('describeShift', () => {
  it('says nothing for a plain single day', () => {
    expect(describeShift(manual({}))).toBeNull();
  });

  it('spells out blocks, repeats and the end date', () => {
    expect(describeShift(manual({ endDate: '2026-03-04' }))).toBe('3 days');
    expect(describeShift(manual({ repeatWeeks: 1 }))).toBe('every week');
    expect(
      describeShift(manual({ endDate: '2026-03-03', repeatWeeks: 2, repeatUntil: '2026-05-20' }))
    ).toBe('2 days · every 2 weeks · until 20 May');
    expect(describeShift(manual({ repeatWeeks: 4, repeatUntil: '2027-01-04' }))).toBe(
      'every 4 weeks · until 4 Jan 2027'
    );
  });
});

describe('deriveWorkDays', () => {
  it('lets a repeating shift fill its days and marks it as repeating', () => {
    const days = deriveWorkDays(
      {
        ...empty,
        patterns: [twoOnTwoOff],
        shifts: [
          manual({ date: '2026-03-04', endDate: '2026-03-05', repeatWeeks: 1, label: 'Nights' }),
        ],
      },
      '2026-03-02',
      '2026-03-12'
    );
    const nights = days.filter((d) => d.shifts.some((s) => s.label === 'Nights'));
    expect(nights.map((d) => d.date)).toEqual([
      '2026-03-04',
      '2026-03-05',
      '2026-03-11',
      '2026-03-12',
    ]);
    expect(nights[0].shifts[0]).toMatchObject({ source: 'manual', repeats: true, id: 's1' });
    // The pattern still runs on the other days.
    expect(days[0].shifts[0].source).toBe('pattern');
  });

  it('lets a day placed by hand beat a repeating shift landing on it', () => {
    const days = deriveWorkDays(
      {
        ...empty,
        shifts: [
          manual({ id: 'series', date: '2026-03-02', repeatWeeks: 1, label: 'Nights' }),
          manual({ id: 'swap', date: '2026-03-09', kind: 'off', label: 'Swapped' }),
        ],
      },
      '2026-03-02',
      '2026-03-16'
    );
    expect(days[0].shifts.map((s) => s.id)).toEqual(['series']);
    expect(days[7]).toMatchObject({ status: 'off' });
    expect(days[7].shifts.map((s) => s.id)).toEqual(['swap']);
    expect(days[14].shifts.map((s) => s.id)).toEqual(['series']);
  });

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
    expect(
      shiftCalendarItems(
        deriveWorkDays(
          { ...empty, shifts: [manual({ repeatWeeks: 1 })] },
          '2026-03-02',
          '2026-03-02'
        ),
        'UTC',
        null
      )[0].recurring
    ).toBe(true);
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
