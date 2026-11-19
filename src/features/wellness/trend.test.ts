import { describe, expect, it } from 'vitest';
import { lineGeometry, moodSummary } from './trend';

const box = { width: 70, height: 50, pad: 5 };

describe('lineGeometry', () => {
  it('centres each day in its column and maps 1 to the bottom and 5 to the top', () => {
    const { runs, singles } = lineGeometry([1, 5], box);
    expect(singles).toEqual([]);
    expect(runs).toEqual(['17.5,45 52.5,5']);
  });

  it('breaks the line at days without a check-in and keeps lone points as dots', () => {
    const { runs, singles } = lineGeometry([3, 3, null, 3, null, null, 3], box);
    expect(runs).toEqual(['5,25 15,25']);
    expect(singles).toEqual([
      { x: 35, y: 25 },
      { x: 65, y: 25 },
    ]);
  });

  it('clamps values to the 1 to 5 scale', () => {
    const { singles } = lineGeometry([9, null, -2], { width: 30, height: 20, pad: 0 });
    expect(singles).toEqual([
      { x: 5, y: 0 },
      { x: 25, y: 20 },
    ]);
  });

  it('is empty for an empty series', () => {
    expect(lineGeometry([], box)).toEqual({ runs: [], singles: [] });
  });
});

describe('moodSummary', () => {
  const week = (...moods: number[]) =>
    moods.map((mood, i) => ({
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      mood,
      energy: 3,
    }));

  it('is null without check-ins this week', () => {
    expect(moodSummary([], week(3))).toBeNull();
  });

  it('gives just the average when last week is empty', () => {
    expect(moodSummary(week(3, 4), [])).toBe('Mood averaged 3.5 this week.');
  });

  it('compares with last week', () => {
    expect(moodSummary(week(4, 4), week(3))).toBe(
      'Mood averaged 4 this week, up on last week (3).'
    );
    expect(moodSummary(week(2), week(3, 4))).toBe(
      'Mood averaged 2 this week, down on last week (3.5).'
    );
    expect(moodSummary(week(3), week(3))).toBe(
      'Mood averaged 3 this week, level with last week (3).'
    );
  });
});
