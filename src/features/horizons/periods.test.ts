import { describe, expect, it } from 'vitest';
import {
  inRange,
  parseQuarterKey,
  parseYearKey,
  quarterKeyOf,
  quarterRange,
  shiftQuarter,
  shiftYear,
  yearRange,
} from './periods';

describe('quarter keys', () => {
  it('derives the key from a date and parses it back', () => {
    expect(quarterKeyOf(new Date(2026, 10, 10))).toBe('2026-Q4');
    expect(parseQuarterKey('2026-Q4')).toEqual(new Date(2026, 9, 1));
    expect(parseQuarterKey('2026-Q5')).toBeNull();
    expect(parseQuarterKey(undefined)).toBeNull();
  });

  it('gives the range, label and months of a quarter', () => {
    const q = quarterRange('2026-Q1');
    expect(q).toMatchObject({ label: 'Q1 2026', start: '2026-01-01', end: '2026-03-31' });
    expect(q.months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('shifts across year boundaries', () => {
    expect(shiftQuarter('2026-Q4', 1)).toBe('2027-Q1');
    expect(shiftQuarter('2026-Q1', -1)).toBe('2025-Q4');
  });
});

describe('year keys', () => {
  it('parses and ranges a year', () => {
    expect(parseYearKey('2026')).toEqual(new Date(2026, 0, 1));
    expect(parseYearKey('26')).toBeNull();
    const y = yearRange('2026');
    expect(y.start).toBe('2026-01-01');
    expect(y.end).toBe('2026-12-31');
    expect(y.quarters.map((q) => q.key)).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
    expect(y.months).toHaveLength(12);
    expect(shiftYear('2026', -1)).toBe('2025');
  });
});

describe('inRange', () => {
  it('is inclusive and false for missing dates', () => {
    expect(inRange('2026-03-31', '2026-01-01', '2026-03-31')).toBe(true);
    expect(inRange('2026-04-01', '2026-01-01', '2026-03-31')).toBe(false);
    expect(inRange(null, '2026-01-01', '2026-03-31')).toBe(false);
  });
});
