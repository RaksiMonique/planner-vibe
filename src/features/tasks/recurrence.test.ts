import { describe, expect, it } from 'vitest';
import { DEFAULT_RECURRENCE } from '@/features/calendar/recurrence';
import {
  buildTaskRrule,
  dateKeyToUtc,
  describeRrule,
  fieldsFromRrule,
  nextOccurrence,
  utcToDateKey,
} from './recurrence';

const fields = (over: Partial<typeof DEFAULT_RECURRENCE>) => ({ ...DEFAULT_RECURRENCE, ...over });

describe('buildTaskRrule and nextOccurrence', () => {
  it('repeats daily from the due date', () => {
    const rule = buildTaskRrule(fields({ recurrence: 'daily' }), '2026-03-04')!;
    expect(nextOccurrence(rule, '2026-03-04')).toBe('2026-03-05');
  });
  it('repeats on chosen weekdays every other week', () => {
    const rule = buildTaskRrule(
      fields({ recurrence: 'weekly', recurrenceInterval: 2, recurrenceDays: ['MO', 'FR'] }),
      '2026-03-06' // a Friday
    )!;
    expect(nextOccurrence(rule, '2026-03-06')).toBe('2026-03-16');
    expect(nextOccurrence(rule, '2026-03-16')).toBe('2026-03-20');
  });
  it('defaults a weekly repeat to the due date weekday', () => {
    const rule = buildTaskRrule(fields({ recurrence: 'weekly' }), '2026-03-04')!;
    expect(nextOccurrence(rule, '2026-03-04')).toBe('2026-03-11');
  });
  it('keeps the day of the month, or the nth weekday', () => {
    expect(
      nextOccurrence(buildTaskRrule(fields({ recurrence: 'monthly' }), '2026-01-31')!, '2026-01-31')
    ).toBe('2026-03-31');
    const nth = buildTaskRrule(
      fields({ recurrence: 'monthly', recurrenceMonthly: 'weekday' }),
      '2026-03-11'
    )!; // 2nd Wednesday
    expect(nextOccurrence(nth, '2026-03-11')).toBe('2026-04-08');
  });
  it('stops after a count or on a date', () => {
    const twice = buildTaskRrule(
      fields({ recurrence: 'weekly', recurrenceEnd: 'count', recurrenceCount: 2 }),
      '2026-03-04'
    )!;
    expect(nextOccurrence(twice, '2026-03-04')).toBe('2026-03-11');
    expect(nextOccurrence(twice, '2026-03-11')).toBeNull();
    const until = buildTaskRrule(
      fields({ recurrence: 'daily', recurrenceEnd: 'until', recurrenceUntil: '2026-03-05' }),
      '2026-03-04'
    )!;
    expect(nextOccurrence(until, '2026-03-04')).toBe('2026-03-05');
    expect(nextOccurrence(until, '2026-03-05')).toBeNull();
  });
  it('is null for a one-off', () => {
    expect(buildTaskRrule(DEFAULT_RECURRENCE, '2026-03-04')).toBeNull();
  });
});

describe('fieldsFromRrule', () => {
  it('reads every field back', () => {
    const f = fields({
      recurrence: 'weekly',
      recurrenceInterval: 3,
      recurrenceDays: ['TU', 'TH'],
      recurrenceEnd: 'until',
      recurrenceUntil: '2026-12-31',
    });
    expect(fieldsFromRrule(buildTaskRrule(f, '2026-03-03'))).toEqual({
      ...f,
      recurrenceCount: undefined,
    });
    const monthly = fields({
      recurrence: 'monthly',
      recurrenceMonthly: 'weekday',
      recurrenceEnd: 'count',
      recurrenceCount: 4,
    });
    expect(fieldsFromRrule(buildTaskRrule(monthly, '2026-03-11'))).toEqual({
      ...monthly,
      recurrenceUntil: undefined,
    });
    expect(fieldsFromRrule(null)).toEqual(DEFAULT_RECURRENCE);
    expect(fieldsFromRrule('garbage')).toEqual(DEFAULT_RECURRENCE);
  });
});

describe('describeRrule and date helpers', () => {
  it('describes a rule in words and round-trips dates', () => {
    expect(describeRrule(buildTaskRrule(fields({ recurrence: 'weekly' }), '2026-03-04'))).toMatch(
      /every week on Wednesday/i
    );
    expect(describeRrule(null)).toBe('Does not repeat');
    expect(utcToDateKey(dateKeyToUtc('2026-03-04'))).toBe('2026-03-04');
  });
});
