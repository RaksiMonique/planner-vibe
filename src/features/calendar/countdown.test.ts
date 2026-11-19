import { describe, expect, it } from 'vitest';
import { daysUntil, daysUntilWording } from './countdown';

describe('daysUntil', () => {
  it('counts calendar days across a month end', () => {
    expect(daysUntil('2026-11-19', '2026-11-19')).toBe(0);
    expect(daysUntil('2026-11-19', '2026-11-20')).toBe(1);
    expect(daysUntil('2026-11-19', '2026-12-01')).toBe(12);
    expect(daysUntil('2026-11-19', '2026-11-18')).toBe(-1);
  });
});

describe('daysUntilWording', () => {
  it('names the near days and counts the rest', () => {
    expect(daysUntilWording(0)).toBe('today');
    expect(daysUntilWording(1)).toBe('tomorrow');
    expect(daysUntilWording(2)).toBe('in 2 days');
    expect(daysUntilWording(45)).toBe('in 45 days');
    expect(daysUntilWording(-1)).toBe('yesterday');
    expect(daysUntilWording(-3)).toBe('3 days ago');
  });
});
