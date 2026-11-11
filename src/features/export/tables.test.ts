import { describe, expect, it } from 'vitest';
import { plannerTables } from './tables';

const keys = () => plannerTables().map((t) => t.key);

describe('plannerTables', () => {
  it('lists user-owned tables from every release and skips reference tables', () => {
    const k = keys();
    for (const expected of [
      'lifeSegments',
      'goals',
      'tasks',
      'events',
      'habits',
      'journalEntries',
      'recipes',
      'visionBoards',
      'shiftPatterns',
      'budgets',
      'userPreferences',
    ]) {
      expect(k).toContain(expected);
    }
    expect(k).not.toContain('profiles');
    expect(k).not.toContain('bibleBooks');
  });

  it('orders every table after the tables it points at', () => {
    const k = keys();
    const before = (a: string, b: string) => expect(k.indexOf(a)).toBeLessThan(k.indexOf(b));
    before('lifeSegments', 'goals');
    before('goals', 'tasks');
    before('projects', 'goalProjects');
    before('goals', 'goalProjects');
    before('habits', 'routineSteps');
    before('routines', 'routineSteps');
    before('timeBlocks', 'timeEntries');
    before('calendars', 'events');
    before('shiftPatterns', 'shifts');
  });

  it('marks self references and the private tables', () => {
    const goals = plannerTables().find((t) => t.key === 'goals')!;
    expect(goals.foreignKeys).toContainEqual({
      column: 'parentGoalId',
      targetKey: 'goals',
      self: true,
      nullable: true,
    });
    expect(goals.foreignKeys).toContainEqual(
      expect.objectContaining({
        column: 'lifeSegmentId',
        targetKey: 'lifeSegments',
        nullable: false,
      })
    );
    expect(plannerTables().find((t) => t.key === 'moodEntries')?.sensitive).toBe(true);
    expect(plannerTables().find((t) => t.key === 'tasks')?.sensitive).toBe(false);
  });
});
