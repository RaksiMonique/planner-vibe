import { describe, expect, it } from 'vitest';
import { entriesForDay, pickPlannedDay } from './plan-preview';

const e = (date: string, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack', sortOrder = 0) => ({
  date,
  slot,
  sortOrder,
});

describe('entriesForDay', () => {
  it('keeps one day in slot order, then by sort order', () => {
    const rows = [
      e('2026-11-19', 'dinner'),
      e('2026-11-19', 'snack', 1),
      e('2026-11-19', 'snack', 0),
      e('2026-11-19', 'breakfast'),
      e('2026-11-20', 'lunch'),
    ];
    expect(entriesForDay(rows, '2026-11-19').map((r) => `${r.slot}${r.sortOrder}`)).toEqual([
      'breakfast0',
      'dinner0',
      'snack0',
      'snack1',
    ]);
  });
});

describe('pickPlannedDay', () => {
  it('prefers today when anything is planned', () => {
    const rows = [e('2026-11-19', 'lunch'), e('2026-11-20', 'dinner')];
    const day = pickPlannedDay(rows, '2026-11-19');
    expect(day?.isToday).toBe(true);
    expect(day?.dateKey).toBe('2026-11-19');
    expect(day?.entries).toHaveLength(1);
  });

  it('falls forward to the next planned day, never back', () => {
    const rows = [e('2026-11-17', 'dinner'), e('2026-11-21', 'dinner'), e('2026-11-20', 'lunch')];
    const day = pickPlannedDay(rows, '2026-11-19');
    expect(day).toMatchObject({ dateKey: '2026-11-20', isToday: false });
  });

  it('returns null when nothing lies ahead', () => {
    expect(pickPlannedDay([e('2026-11-18', 'dinner')], '2026-11-19')).toBeNull();
    expect(pickPlannedDay([], '2026-11-19')).toBeNull();
  });
});
