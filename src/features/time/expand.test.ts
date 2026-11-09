import { describe, expect, it } from 'vitest';
import { expandTimeBlocks, type ExpandableBlock } from './expand';

const base: ExpandableBlock = {
  id: 'b1',
  title: 'Deep work',
  startsAt: new Date('2026-11-02T13:00:00Z'),
  endsAt: new Date('2026-11-02T15:00:00Z'),
  activityType: 'deep_work',
  lifeSegmentId: 'seg',
  projectId: null,
  taskId: null,
  rrule: null,
  dtstart: null,
  until: null,
  exdates: [],
};
const from = new Date('2026-11-02T00:00:00Z');
const to = new Date('2026-11-09T00:00:00Z');

describe('expandTimeBlocks', () => {
  it('passes a plain block through when it overlaps the range', () => {
    const items = expandTimeBlocks([base], from, to);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'b1',
      accent: 'burgundy',
      recurring: false,
      end: '2026-11-02T15:00:00.000Z',
    });
    expect(expandTimeBlocks([base], new Date('2026-11-10T00:00:00Z'), to)).toHaveLength(0);
  });

  it('expands weekday rules, skips exdates and keeps the duration', () => {
    const items = expandTimeBlocks(
      [
        {
          ...base,
          id: 'r1',
          rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
          dtstart: base.startsAt,
          exdates: ['2026-11-04'],
        },
      ],
      from,
      to
    );
    // Mon 2 Nov to Fri 6 Nov, minus Wednesday
    expect(items.map((i) => i.start.slice(0, 10))).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-05',
      '2026-11-06',
    ]);
    expect(items.every((i) => i.recurring)).toBe(true);
    expect(items[0].end).toBe('2026-11-02T15:00:00.000Z');
    expect(items[0].id).toBe('r1:2026-11-02');
  });

  it('respects until and ignores an unparsable rule', () => {
    const items = expandTimeBlocks(
      [
        { ...base, id: 'u', rrule: 'FREQ=DAILY', until: new Date('2026-11-04T00:00:00Z') },
        { ...base, id: 'bad', rrule: 'NOT A RULE' },
      ],
      from,
      to
    );
    expect(items.map((i) => i.start.slice(0, 10))).toEqual(['2026-11-02', '2026-11-03']);
  });

  it('includes a recurring occurrence that started before the range but is still running', () => {
    const items = expandTimeBlocks(
      [{ ...base, id: 'late', rrule: 'FREQ=DAILY' }],
      new Date('2026-11-03T14:00:00Z'),
      new Date('2026-11-03T20:00:00Z')
    );
    expect(items.map((i) => i.start)).toEqual(['2026-11-03T13:00:00.000Z']);
  });
});
