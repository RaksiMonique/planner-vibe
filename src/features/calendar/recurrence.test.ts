import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECURRENCE,
  buildRRule,
  describeRecurrence,
  parseRRule,
  utcDayShift,
  weekdayOf,
} from './recurrence';

const fields = (over: Partial<typeof DEFAULT_RECURRENCE>) => ({ ...DEFAULT_RECURRENCE, ...over });
const noon = new Date('2030-01-15T17:00:00Z'); // 12:00 in Jamaica, a Tuesday

describe('weekdayOf and utcDayShift', () => {
  it('reads the local weekday and the day the UTC date drifts by', () => {
    expect(weekdayOf('2030-01-15')).toBe('TU');
    expect(weekdayOf('2030-01-19T20:00')).toBe('SA');
    expect(utcDayShift('2030-01-15', noon)).toBe(0);
    // 20:00 in Jamaica is 01:00 UTC the next day.
    expect(utcDayShift('2030-01-15', new Date('2030-01-16T01:00:00Z'))).toBe(1);
  });
});

describe('buildRRule', () => {
  it('is null without a repeat and plain for a simple one', () => {
    expect(buildRRule(DEFAULT_RECURRENCE, { dtstart: noon, dayShift: 0 })).toBeNull();
    expect(buildRRule(fields({ recurrence: 'daily' }), { dtstart: noon, dayShift: 0 })).toBe(
      'FREQ=DAILY'
    );
  });

  it('writes the interval, weekdays and count', () => {
    expect(
      buildRRule(
        fields({
          recurrence: 'weekly',
          recurrenceInterval: 2,
          recurrenceDays: ['TU', 'TH'],
          recurrenceEnd: 'count',
          recurrenceCount: 6,
        }),
        { dtstart: noon, dayShift: 0 }
      )
    ).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;COUNT=6');
  });

  it('shifts weekdays onto the UTC day the rule runs on, and back again', () => {
    const evening = new Date('2030-01-16T01:00:00Z'); // Tue 20:00 in Jamaica
    const rule = buildRRule(fields({ recurrence: 'weekly', recurrenceDays: ['TU', 'SU'] }), {
      dtstart: evening,
      dayShift: 1,
    });
    expect(rule).toBe('FREQ=WEEKLY;BYDAY=WE,MO');
    expect(parseRRule(rule, { dayShift: 1 }).recurrenceDays).toEqual(['TU', 'SU']);
  });

  it('pins a monthly repeat to the nth weekday of the start', () => {
    expect(
      buildRRule(fields({ recurrence: 'monthly', recurrenceMonthly: 'weekday' }), {
        dtstart: noon,
        dayShift: 0,
      })
    ).toBe('FREQ=MONTHLY;BYDAY=3TU');
    const lastWeek = new Date('2030-01-29T17:00:00Z');
    expect(
      buildRRule(fields({ recurrence: 'monthly', recurrenceMonthly: 'weekday' }), {
        dtstart: lastWeek,
        dayShift: 0,
      })
    ).toBe('FREQ=MONTHLY;BYDAY=-1TU');
  });
});

describe('parseRRule', () => {
  it('reads a rule back into fields, with the end from the until column', () => {
    expect(
      parseRRule('FREQ=MONTHLY;INTERVAL=3;BYDAY=2WE', { dayShift: 0, until: '2031-01-01' })
    ).toEqual({
      recurrence: 'monthly',
      recurrenceInterval: 3,
      recurrenceDays: [],
      recurrenceMonthly: 'weekday',
      recurrenceEnd: 'until',
      recurrenceUntil: '2031-01-01',
      recurrenceCount: undefined,
    });
    expect(parseRRule('FREQ=YEARLY;COUNT=3', { dayShift: 0 })).toMatchObject({
      recurrence: 'yearly',
      recurrenceEnd: 'count',
      recurrenceCount: 3,
    });
    expect(parseRRule(null, { dayShift: 0 })).toEqual(DEFAULT_RECURRENCE);
    expect(parseRRule('FREQ=HOURLY', { dayShift: 0 })).toEqual(DEFAULT_RECURRENCE);
  });
});

describe('describeRecurrence', () => {
  it('reads back in words', () => {
    expect(describeRecurrence(DEFAULT_RECURRENCE, '2030-01-15')).toBe('');
    expect(describeRecurrence(fields({ recurrence: 'weekly' }), '2030-01-15')).toBe(
      'Every week on Tue'
    );
    expect(
      describeRecurrence(
        fields({
          recurrence: 'weekly',
          recurrenceInterval: 2,
          recurrenceDays: ['MO', 'FR'],
          recurrenceEnd: 'until',
          recurrenceUntil: '2030-06-30',
        }),
        '2030-01-15'
      )
    ).toBe('Every 2 weeks on Mon, Fri, until 30 Jun 2030');
    expect(
      describeRecurrence(
        fields({ recurrence: 'monthly', recurrenceMonthly: 'weekday' }),
        '2030-01-15'
      )
    ).toBe('Every month on the third Tuesday');
    expect(
      describeRecurrence(
        fields({ recurrence: 'daily', recurrenceEnd: 'count', recurrenceCount: 1 }),
        '2030-01-15'
      )
    ).toBe('Every day, 1 time');
  });
});
