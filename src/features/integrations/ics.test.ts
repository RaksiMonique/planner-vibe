import { describe, expect, it } from 'vitest';
import type { CalendarItem } from '@/features/calendar/expand';
import { buildIcs, dateValue, escapeText, fold } from './ics';

const item = (over: Partial<CalendarItem>): CalendarItem => ({
  id: 'abc',
  sourceId: 'abc',
  type: 'event',
  title: 'Dentist',
  allDay: false,
  start: '2026-11-12T14:30:00.000Z',
  end: '2026-11-12T15:00:00.000Z',
  accent: 'burgundy',
  calendarId: null,
  segmentId: null,
  recurring: false,
  ...over,
});

describe('buildIcs', () => {
  it('writes a calendar with timed and all-day entries', () => {
    const ics = buildIcs({
      name: 'Life Planner',
      now: new Date('2026-11-10T09:00:00Z'),
      siteUrl: 'https://planner.test',
      items: [
        item({}),
        item({
          id: 'task-1:2026-11-13',
          type: 'task',
          title: 'Pay rent',
          allDay: true,
          start: '2026-11-13',
          end: null,
        }),
      ],
    });
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(lines).toContain('UID:abc@life-planner');
    expect(lines).toContain('DTSTART:20261112T143000Z');
    expect(lines).toContain('DTEND:20261112T150000Z');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261113');
    expect(lines).toContain('DTEND;VALUE=DATE:20261114');
    expect(lines).toContain('CATEGORIES:Task');
    expect(lines).toContain('URL:https://planner.test/tasks');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('gives a timed item without an end one hour', () => {
    const ics = buildIcs({ name: 'x', items: [item({ end: null })] });
    expect(ics).toContain('DTEND:20261112T153000Z');
  });
});

describe('escapeText and dateValue', () => {
  it('escapes commas, semicolons, backslashes and newlines', () => {
    expect(escapeText('a, b; c\\d\nnext')).toBe('a\\, b\; c\\\\d\\nnext');
  });
  it('turns a date key into DATE values with an exclusive end', () => {
    expect(dateValue('2026-12-31')).toBe('20261231');
    expect(dateValue('2026-12-31', true)).toBe('20270101');
  });
});

describe('fold', () => {
  it('leaves short lines alone and folds long ones at 75 octets', () => {
    expect(fold('SUMMARY:short')).toBe('SUMMARY:short');
    const long = 'SUMMARY:' + 'x'.repeat(100);
    const folded = fold(long);
    const parts = folded.split('\r\n ');
    expect(parts).toHaveLength(2);
    expect(Buffer.byteLength(parts[0])).toBe(75);
    expect(parts.join('')).toBe(long);
  });

  it('never splits a multibyte character', () => {
    const folded = fold('SUMMARY:' + 'é'.repeat(60));
    for (const part of folded.split('\r\n '))
      expect(Buffer.byteLength(part)).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe('SUMMARY:' + 'é'.repeat(60));
  });
});
