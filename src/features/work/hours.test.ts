import { describe, expect, it } from 'vitest';
import type { WorkDay } from './availability';
import {
  expectedWeeklyHours,
  formatHours,
  nextShift,
  shiftHours,
  summariseWeekHours,
} from './hours';

const day = (date: string, shifts: WorkDay['shifts']): WorkDay => ({
  date,
  status: shifts.some((s) => s.kind === 'work') ? 'working' : 'off',
  shifts,
});
const work = (start?: string, end?: string): WorkDay['shifts'][number] => ({
  kind: 'work',
  label: 'Work',
  source: 'pattern',
  ...(start ? { start } : {}),
  ...(end ? { end } : {}),
});

describe('shiftHours', () => {
  it('measures a day shift', () => {
    expect(shiftHours('09:00', '17:30')).toBe(8.5);
  });
  it('rolls an overnight shift past midnight', () => {
    expect(shiftHours('22:00', '06:00')).toBe(8);
  });
  it('is zero without both times', () => {
    expect(shiftHours('09:00', undefined)).toBe(0);
    expect(shiftHours(null, null)).toBe(0);
  });
});

describe('summariseWeekHours', () => {
  const days = [
    day('2026-11-16', [work('09:00', '17:00')]),
    day('2026-11-17', [work('09:00', '17:00')]),
    day('2026-11-18', [{ ...work(), kind: 'on_call' }]),
    day('2026-11-19', [work('22:00', '06:00')]),
    day('2026-11-20', [work()]),
    day('2026-11-21', [work('09:00', '13:00')]),
    day('2026-11-22', []),
  ];
  it('splits hours at today, counting today as worked', () => {
    const totals = summariseWeekHours(days, '2026-11-19');
    expect(totals.worked).toBe(24);
    expect(totals.planned).toBe(4);
    expect(totals.untimed).toBe(1);
    expect(totals.shifts).toBe(5);
  });
  it('ignores on-call days', () => {
    const totals = summariseWeekHours(
      [day('2026-11-18', [{ ...work('09:00', '17:00'), kind: 'on_call' }])],
      '2026-11-19'
    );
    expect(totals).toEqual({ worked: 0, planned: 0, untimed: 0, shifts: 0 });
  });
});

describe('expectedWeeklyHours', () => {
  it('spreads a cycle over seven days', () => {
    expect(
      expectedWeeklyHours([
        {
          isActive: true,
          cycle: [
            { kind: 'work', start: '07:00', end: '19:00' },
            { kind: 'work', start: '07:00', end: '19:00' },
            { kind: 'off' },
            { kind: 'off' },
          ],
        },
      ])
    ).toBe(42);
  });
  it('is null without an active pattern or when a work day has no times', () => {
    expect(expectedWeeklyHours([])).toBeNull();
    expect(
      expectedWeeklyHours([
        { isActive: false, cycle: [{ kind: 'work', start: '09:00', end: '17:00' }] },
      ])
    ).toBeNull();
    expect(
      expectedWeeklyHours([{ isActive: true, cycle: [{ kind: 'work' }, { kind: 'off' }] }])
    ).toBeNull();
  });
});

describe('nextShift', () => {
  const days = [
    day('2026-11-18', [work('09:00', '17:00')]),
    day('2026-11-19', [work('09:00', '17:00')]),
    day('2026-11-20', [work('22:00', '06:00')]),
  ];
  it('is today while the shift has not ended', () => {
    expect(nextShift(days, '2026-11-19', '08:00')?.date).toBe('2026-11-19');
    expect(nextShift(days, '2026-11-19', '12:00')?.date).toBe('2026-11-19');
  });
  it('moves on once today has ended, never looking back', () => {
    expect(nextShift(days, '2026-11-19', '17:00')?.date).toBe('2026-11-20');
  });
  it('keeps an overnight or untimed shift today', () => {
    expect(nextShift(days, '2026-11-20', '23:30')?.date).toBe('2026-11-20');
    expect(nextShift([day('2026-11-20', [work()])], '2026-11-20', '23:30')?.date).toBe(
      '2026-11-20'
    );
  });
  it('is null with nothing ahead', () => {
    expect(nextShift(days, '2026-11-21', '08:00')).toBeNull();
  });
});

describe('formatHours', () => {
  it('drops the decimal from whole hours', () => {
    expect(formatHours(38)).toBe('38');
    expect(formatHours(7.5)).toBe('7.5');
    expect(formatHours(7.25)).toBe('7.3');
  });
});
