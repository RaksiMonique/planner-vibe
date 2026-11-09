import { describe, expect, it } from 'vitest';
import { buildMonthGrid, daysElapsed, groupByWeek, parseMonthKey, shiftMonth } from './grid';

describe('buildMonthGrid', () => {
  it('pads November 2026 to whole weeks from a Monday start', () => {
    const rows = buildMonthGrid('2026-11', 1);
    expect(rows).toHaveLength(6);
    expect(rows[0].start).toBe('2026-10-26');
    expect(rows[0].cells[0].inMonth).toBe(false);
    expect(rows[0].cells[6]).toEqual({ key: '2026-11-01', inMonth: true });
    expect(rows[5].end).toBe('2026-12-06');
    expect(rows.flatMap((r) => r.cells).filter((c) => c.inMonth)).toHaveLength(30);
  });

  it('respects a Sunday week start', () => {
    const rows = buildMonthGrid('2026-11', 0);
    expect(rows).toHaveLength(5);
    expect(rows[0].start).toBe('2026-11-01');
    expect(rows[4].end).toBe('2026-12-05');
  });

  it('rejects malformed keys', () => {
    expect(parseMonthKey('2026-13')).toBeNull();
    expect(parseMonthKey('nope')).toBeNull();
    expect(() => buildMonthGrid('nope', 1)).toThrow();
  });
});

describe('shiftMonth and daysElapsed', () => {
  it('moves across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
  it('counts days through today, the whole month when past, none when future', () => {
    expect(daysElapsed('2026-11', '2026-11-07')).toBe(7);
    expect(daysElapsed('2026-10', '2026-11-07')).toBe(31);
    expect(daysElapsed('2026-12', '2026-11-07')).toBe(0);
  });
});

describe('groupByWeek', () => {
  it('buckets by the rows and drops items outside the grid', () => {
    const rows = buildMonthGrid('2026-11', 1);
    const items = [
      { d: '2026-11-02' },
      { d: '2026-11-08' },
      { d: '2026-11-09' },
      { d: '2027-01-01' },
      { d: null },
    ];
    const grouped = groupByWeek(items, (i) => i.d, rows);
    expect(grouped[0].items).toHaveLength(0); // 26 Oct – 1 Nov
    expect(grouped[1].items).toHaveLength(2); // 2 – 8 Nov
    expect(grouped[2].items).toEqual([{ d: '2026-11-09' }]);
    expect(grouped.flatMap((g) => g.items)).toHaveLength(3);
  });
});
