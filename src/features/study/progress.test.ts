import { describe, expect, it } from 'vitest';
import { courseProgress, formatMinutes, minutesBySubject, totalMinutes } from './progress';

describe('courseProgress', () => {
  it('is 100 when done, whatever the lessons say', () => {
    expect(courseProgress({ status: 'done', progress: 10 }, [{ completedAt: null }])).toBe(100);
  });
  it('follows lessons when there are any', () => {
    const lessons = [{ completedAt: new Date() }, { completedAt: null }, { completedAt: null }];
    expect(courseProgress({ status: 'in_progress', progress: 90 }, lessons)).toBe(33);
  });
  it('falls back to the manual percentage, clamped', () => {
    expect(courseProgress({ status: 'in_progress', progress: 42 }, [])).toBe(42);
    expect(courseProgress({ status: 'planned', progress: 140 }, [])).toBe(100);
    expect(courseProgress({ status: 'planned', progress: -5 }, [])).toBe(0);
  });
});

describe('minutes helpers', () => {
  const sessions = [
    { subjectId: 'a', subjectName: 'Maths', durationMinutes: 30 },
    { subjectId: 'b', subjectName: 'Greek', durationMinutes: 50 },
    { subjectId: 'a', subjectName: 'Maths', durationMinutes: 45 },
    { subjectId: null, subjectName: null, durationMinutes: 10 },
  ];
  it('groups minutes by subject, most first', () => {
    expect(minutesBySubject(sessions)).toEqual([
      { key: 'a', label: 'Maths', minutes: 75 },
      { key: 'b', label: 'Greek', minutes: 50 },
      { key: 'none', label: 'No subject', minutes: 10 },
    ]);
  });
  it('sums totals and formats them', () => {
    expect(totalMinutes(sessions)).toBe(135);
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(135)).toBe('2 h 15 min');
  });
});
