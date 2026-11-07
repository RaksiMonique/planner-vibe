import { describe, expect, it } from 'vitest';
import { expandEvents, type ExpandableEvent } from './expand';

const base: ExpandableEvent = {
  id: 'e1',
  title: 'Stand-up',
  isAllDay: false,
  allDayDate: null,
  startsAt: new Date('2026-03-02T09:00:00Z'),
  endsAt: new Date('2026-03-02T09:15:00Z'),
  rrule: null,
  dtstart: null,
  until: null,
  exdates: [],
  lifeSegmentId: 'seg',
  calendarId: 'cal',
  calendar: { accent: 'terracotta' },
};
const from = new Date('2026-03-02T00:00:00Z');
const to = new Date('2026-03-07T00:00:00Z'); // Mon 2 to Fri 6 inclusive

describe('expandEvents', () => {
  it('passes a one-off timed event through when it overlaps the range', () => {
    expect(expandEvents([base], from, to)).toHaveLength(1);
    expect(
      expandEvents(
        [
          {
            ...base,
            startsAt: new Date('2026-03-09T09:00:00Z'),
            endsAt: new Date('2026-03-09T10:00:00Z'),
          },
        ],
        from,
        to
      )
    ).toHaveLength(0);
  });

  it('includes one-off all-day events by date', () => {
    const allDay = {
      ...base,
      isAllDay: true,
      allDayDate: '2026-03-04',
      startsAt: null,
      endsAt: null,
    };
    const [item] = expandEvents([allDay], from, to);
    expect(item).toMatchObject({ allDay: true, start: '2026-03-04', end: null, recurring: false });
    expect(expandEvents([{ ...allDay, allDayDate: '2026-03-08' }], from, to)).toHaveLength(0);
  });

  it('expands a daily timed series keeping the duration', () => {
    const items = expandEvents(
      [{ ...base, rrule: 'FREQ=DAILY', dtstart: base.startsAt }],
      from,
      to
    );
    expect(items.map((i) => i.start)).toEqual([
      '2026-03-02T09:00:00.000Z',
      '2026-03-03T09:00:00.000Z',
      '2026-03-04T09:00:00.000Z',
      '2026-03-05T09:00:00.000Z',
      '2026-03-06T09:00:00.000Z',
    ]);
    expect(items[0].end).toBe('2026-03-02T09:15:00.000Z');
    expect(items[0].id).toBe('e1:2026-03-02');
    expect(items.every((i) => i.recurring && i.sourceId === 'e1')).toBe(true);
  });

  it('honours exdates and until', () => {
    const items = expandEvents(
      [
        {
          ...base,
          rrule: 'FREQ=DAILY',
          dtstart: base.startsAt,
          exdates: ['2026-03-03'],
          until: new Date('2026-03-04T23:59:59Z'),
        },
      ],
      from,
      to
    );
    expect(items.map((i) => i.start.slice(0, 10))).toEqual(['2026-03-02', '2026-03-04']);
  });

  it('expands a weekly all-day series from its date', () => {
    const weekly = {
      ...base,
      isAllDay: true,
      allDayDate: '2026-02-23',
      startsAt: null,
      endsAt: null,
      rrule: 'FREQ=WEEKLY',
      dtstart: null,
    };
    const items = expandEvents(
      [weekly],
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-31T00:00:00Z')
    );
    expect(items.map((i) => i.start)).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
      '2026-03-30',
    ]);
    expect(items[0].allDay).toBe(true);
  });
});
