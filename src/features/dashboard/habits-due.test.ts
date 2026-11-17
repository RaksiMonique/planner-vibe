import { describe, expect, it } from 'vitest';
import type { HabitOverview } from '@/features/habits/queries';
import { habitsDueToday } from './habits-due';

const habit = (over: Partial<HabitOverview> & { id: string }) =>
  ({
    frequency: 'daily',
    doneToday: false,
    stats: { period: { count: 0, target: 1 } },
    ...over,
  }) as unknown as HabitOverview;

describe('habitsDueToday', () => {
  it('keeps unchecked daily habits and weekly ones short of their target', () => {
    const due = habitsDueToday([
      habit({ id: 'water' }),
      habit({ id: 'read', doneToday: true }),
      habit({
        id: 'run',
        frequency: 'weekly',
        stats: { period: { count: 1, target: 3 } },
      } as never),
      habit({
        id: 'swim',
        frequency: 'weekly',
        stats: { period: { count: 3, target: 3 } },
      } as never),
    ]);
    expect(due.map((h) => h.id)).toEqual(['water', 'run']);
  });
});
