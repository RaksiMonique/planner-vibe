import { describe, expect, it } from 'vitest';
import { TOTAL_CHAPTERS } from './bible-books';
import {
  chapterKey,
  dayIndex,
  describeChapters,
  expectedReadBy,
  nextReading,
  planChapters,
  planProgress,
  scheduledForDay,
} from './plans';

const gospels = { bookIds: [47, 48, 49, 50], chaptersPerDay: 2, startDate: '2026-11-01' };

describe('planChapters', () => {
  it('lists every chapter in order, whole canon by default', () => {
    expect(planChapters(null)).toHaveLength(TOTAL_CHAPTERS);
    const g = planChapters(gospels.bookIds);
    expect(g).toHaveLength(28 + 16 + 24 + 21);
    expect(g[0]).toEqual({ bookId: 47, chapter: 1 });
    expect(g[28]).toEqual({ bookId: 48, chapter: 1 });
  });
});

describe('schedule', () => {
  it('counts days from the start date', () => {
    expect(dayIndex('2026-11-01', '2026-11-01')).toBe(0);
    expect(dayIndex('2026-11-01', '2026-11-03')).toBe(2);
    expect(dayIndex('2026-11-01', '2026-10-31')).toBe(-1);
  });
  it('assigns chapters per day without skipping', () => {
    expect(scheduledForDay(gospels, '2026-11-01')).toEqual([
      { bookId: 47, chapter: 1 },
      { bookId: 47, chapter: 2 },
    ]);
    expect(scheduledForDay(gospels, '2026-11-15')).toEqual([
      { bookId: 48, chapter: 1 },
      { bookId: 48, chapter: 2 },
    ]);
    expect(scheduledForDay(gospels, '2026-10-20')).toEqual([]);
  });
  it('caps the expected count at the plan length', () => {
    expect(expectedReadBy(gospels, '2026-11-01', 89)).toBe(2);
    expect(expectedReadBy(gospels, '2027-06-01', 89)).toBe(89);
  });
});

describe('progress and next reading', () => {
  it('continues from the first unread chapter when behind', () => {
    const chapters = planChapters(gospels.bookIds);
    const read = new Set(chapters.slice(0, 3).map(chapterKey));
    expect(nextReading(chapters, read, 2)).toEqual([
      { bookId: 47, chapter: 4 },
      { bookId: 47, chapter: 5 },
    ]);
    const p = planProgress(gospels, read, '2026-11-05');
    expect(p).toMatchObject({ read: 3, total: 89, percent: 3, behind: 7, remainingDays: 43 });
  });
});

describe('describeChapters', () => {
  it('groups consecutive chapters', () => {
    expect(
      describeChapters([
        { bookId: 1, chapter: 1 },
        { bookId: 1, chapter: 2 },
        { bookId: 1, chapter: 3 },
        { bookId: 50, chapter: 3 },
      ])
    ).toBe('Genesis 1-3, John 3');
    expect(describeChapters([])).toBe('');
  });
});
