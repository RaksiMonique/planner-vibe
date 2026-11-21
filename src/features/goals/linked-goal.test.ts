import { describe, expect, it } from 'vitest';
import { goalForProject, pickLinkedGoal } from './linked-goal';

const goals = [
  { id: 'q', horizon: 'quarterly' as const },
  { id: 'l', horizon: 'lifelong' as const },
  { id: 'a', horizon: 'annual' as const },
  { id: 'a2', horizon: 'annual' as const },
];

describe('pickLinkedGoal', () => {
  it('returns nothing when the project supports no goal', () => {
    expect(pickLinkedGoal([])).toBeNull();
  });
  it('returns the one goal when there is one', () => {
    expect(pickLinkedGoal([goals[0]])?.id).toBe('q');
  });
  it('prefers the longest horizon when there are several', () => {
    expect(pickLinkedGoal(goals)?.id).toBe('l');
    expect(pickLinkedGoal([goals[0], goals[2]])?.id).toBe('a');
  });
  it('keeps the first listed on a tie', () => {
    expect(pickLinkedGoal([goals[2], goals[3]])?.id).toBe('a');
    expect(pickLinkedGoal([goals[3], goals[2]])?.id).toBe('a2');
  });
});

describe('goalForProject', () => {
  const projects = [{ id: 'p1', goalIds: ['q', 'a'] }, { id: 'p2', goalIds: [] }, { id: 'p3' }];
  it('reads the project links from the picker options', () => {
    expect(goalForProject('p1', projects, goals)?.id).toBe('a');
    expect(goalForProject('p2', projects, goals)).toBeNull();
    expect(goalForProject('p3', projects, goals)).toBeNull();
    expect(goalForProject('missing', projects, goals)).toBeNull();
  });
  it('ignores linked goals that are no longer offered, such as achieved ones', () => {
    expect(goalForProject('p1', projects, [goals[0]])?.id).toBe('q');
  });
});
