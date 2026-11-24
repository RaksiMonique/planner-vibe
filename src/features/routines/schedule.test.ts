import { describe, expect, it } from 'vitest';
import {
  describeSchedule,
  isDueOn,
  needsAnchor,
  nextDueOn,
  repeatKeyOf,
  type RoutineSchedule,
} from './schedule';

const weekly = (over: Partial<RoutineSchedule> = {}): RoutineSchedule => ({
  frequency: 'weekly',
  interval: 1,
  daysOfWeek: [1, 2, 3, 4, 5],
  startsOn: null,
  ...over,
});

describe('isDueOn', () => {
  it('runs every week on its weekdays with no anchor', () => {
    // 2026-11-23 is a Monday, 2026-11-28 a Saturday
    expect(isDueOn(weekly(), '2026-11-23', 1)).toBe(true);
    expect(isDueOn(weekly(), '2026-11-28', 1)).toBe(false);
  });

  it('counts calendar weeks from the anchor for every N weeks', () => {
    const s = weekly({ interval: 2, daysOfWeek: [1, 4], startsOn: '2026-11-26' }); // Thu
    expect(isDueOn(s, '2026-11-23', 1)).toBe(false); // Mon before the anchor
    expect(isDueOn(s, '2026-11-26', 1)).toBe(true);
    expect(isDueOn(s, '2026-11-30', 1)).toBe(false); // Mon of the off week
    expect(isDueOn(s, '2026-12-07', 1)).toBe(true); // Mon two weeks on
    expect(isDueOn(s, '2026-12-10', 1)).toBe(true);
  });

  it('respects the week start when counting weeks', () => {
    // Anchor Sun 2026-11-29; with Monday weeks the next Monday is a new week,
    // with Sunday weeks it is the same week.
    const s = weekly({ interval: 2, daysOfWeek: [0, 1], startsOn: '2026-11-29' });
    expect(isDueOn(s, '2026-11-30', 1)).toBe(false);
    expect(isDueOn(s, '2026-11-30', 0)).toBe(true);
  });

  it('runs monthly on the same day of the month, or the last day of a short month', () => {
    const s: RoutineSchedule = {
      frequency: 'monthly',
      interval: 1,
      daysOfWeek: [],
      startsOn: '2026-01-31',
    };
    expect(isDueOn(s, '2026-01-31', 1)).toBe(true);
    expect(isDueOn(s, '2026-02-28', 1)).toBe(true);
    expect(isDueOn(s, '2026-03-31', 1)).toBe(true);
    expect(isDueOn(s, '2026-03-30', 1)).toBe(false);
    expect(isDueOn(s, '2025-12-31', 1)).toBe(false);
  });

  it('skips months for every N months', () => {
    const s: RoutineSchedule = {
      frequency: 'monthly',
      interval: 3,
      daysOfWeek: [],
      startsOn: '2026-02-14',
    };
    expect(isDueOn(s, '2026-05-14', 1)).toBe(true);
    expect(isDueOn(s, '2026-04-14', 1)).toBe(false);
  });

  it('never runs monthly without an anchor', () => {
    expect(
      isDueOn(
        { frequency: 'monthly', interval: 1, daysOfWeek: [], startsOn: null },
        '2026-11-24',
        1
      )
    ).toBe(false);
  });
});

describe('nextDueOn', () => {
  it('finds the first run on or after the date', () => {
    const s = weekly({ interval: 2, daysOfWeek: [4], startsOn: '2026-11-26' });
    expect(nextDueOn(s, '2026-11-24', 1)).toBe('2026-11-26');
    expect(nextDueOn(s, '2026-11-27', 1)).toBe('2026-12-10');
  });

  it('gives up when nothing is due within the horizon', () => {
    expect(nextDueOn(weekly({ daysOfWeek: [] }), '2026-11-24', 1)).toBeNull();
  });
});

describe('describeSchedule', () => {
  it('names the cadence and the days', () => {
    expect(describeSchedule(weekly())).toBe('Every week on Mon, Tue, Wed, Thu and Fri');
    expect(describeSchedule(weekly({ daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }))).toBe('Every day');
    expect(describeSchedule(weekly({ interval: 2, daysOfWeek: [6], startsOn: '2026-11-28' }))).toBe(
      'Every 2 weeks on Sat'
    );
    expect(
      describeSchedule({
        frequency: 'monthly',
        interval: 3,
        daysOfWeek: [],
        startsOn: '2026-02-01',
      })
    ).toBe('Every 3 months on the 1st');
    expect(
      describeSchedule({
        frequency: 'monthly',
        interval: 1,
        daysOfWeek: [],
        startsOn: '2026-02-22',
      })
    ).toBe('Every month on the 22nd');
  });
});

describe('repeatKeyOf and needsAnchor', () => {
  it('maps stored values back to a form choice, falling back to weekly', () => {
    expect(repeatKeyOf({ frequency: 'monthly', interval: 6 })).toBe('monthly-6');
    expect(repeatKeyOf({ frequency: 'weekly', interval: 5 })).toBe('weekly-1');
  });
  it('only plain weekly routines run without a first day', () => {
    expect(needsAnchor({ frequency: 'weekly', interval: 1 })).toBe(false);
    expect(needsAnchor({ frequency: 'weekly', interval: 2 })).toBe(true);
    expect(needsAnchor({ frequency: 'monthly', interval: 1 })).toBe(true);
  });
});
