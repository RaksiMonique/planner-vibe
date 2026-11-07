import { describe, expect, it } from 'vitest';
import {
  describeRrule,
  nextOccurrence,
  presetFromRrule,
  presetToRrule,
  utcToDateKey,
  dateKeyToUtc,
} from './recurrence';

describe('presetToRrule and nextOccurrence', () => {
  // 4 March 2026 is a Wednesday
  it('daily moves one day at a time', () => {
    const rule = presetToRrule('daily', '2026-03-04')!;
    expect(nextOccurrence(rule, '2026-03-04')).toBe('2026-03-05');
  });
  it('weekdays skip the weekend', () => {
    const rule = presetToRrule('weekdays', '2026-03-06')!; // Friday
    expect(nextOccurrence(rule, '2026-03-06')).toBe('2026-03-09');
  });
  it('weekly keeps the weekday of the due date', () => {
    const rule = presetToRrule('weekly', '2026-03-04')!;
    expect(nextOccurrence(rule, '2026-03-04')).toBe('2026-03-11');
    expect(nextOccurrence(rule, '2026-03-05')).toBe('2026-03-11');
  });
  it('monthly keeps the day of month', () => {
    const rule = presetToRrule('monthly', '2026-01-31')!;
    // February has no 31st, so rrule skips to March
    expect(nextOccurrence(rule, '2026-01-31')).toBe('2026-03-31');
  });
  it('none produces no rule', () => {
    expect(presetToRrule('none', '2026-03-04')).toBeNull();
  });
});

describe('presetFromRrule', () => {
  it('round-trips every preset', () => {
    for (const preset of ['daily', 'weekdays', 'weekly', 'monthly'] as const) {
      expect(presetFromRrule(presetToRrule(preset, '2026-03-04'))).toBe(preset);
    }
    expect(presetFromRrule(null)).toBe('none');
    expect(presetFromRrule('garbage')).toBe('none');
  });
});

describe('describeRrule and date helpers', () => {
  it('describes a rule in words', () => {
    expect(describeRrule(presetToRrule('weekly', '2026-03-04'))).toMatch(
      /every week on Wednesday/i
    );
    expect(describeRrule(null)).toBe('Does not repeat');
  });
  it('converts date keys without time zone drift', () => {
    expect(utcToDateKey(dateKeyToUtc('2026-12-31'))).toBe('2026-12-31');
  });
});
