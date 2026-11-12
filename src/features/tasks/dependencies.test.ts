import { describe, expect, it } from 'vitest';
import { blockedLabel, findCycles } from './dependencies';

const edge = (taskId: string, dependsOnTaskId: string) => ({ taskId, dependsOnTaskId });

describe('findCycles', () => {
  it('allows waiting on an unrelated task', () => {
    expect(findCycles('a', ['b'], [edge('c', 'd')])).toEqual([]);
  });

  it('refuses a task waiting on itself', () => {
    expect(findCycles('a', ['a'], [])).toEqual(['a']);
  });

  it('refuses a direct circle', () => {
    // b already waits on a, so a cannot wait on b.
    expect(findCycles('a', ['b'], [edge('b', 'a')])).toEqual(['b']);
  });

  it('refuses a circle through other tasks', () => {
    // c waits on b, b waits on a: a waiting on c closes the loop.
    expect(findCycles('a', ['c', 'x'], [edge('c', 'b'), edge('b', 'a')])).toEqual(['c']);
  });

  it('ignores the edges being replaced', () => {
    // a currently waits on b; keeping b is fine even though a -> b -> ... never reaches a.
    expect(findCycles('a', ['b'], [edge('a', 'b')])).toEqual([]);
  });

  it('survives loops elsewhere in the graph', () => {
    expect(findCycles('a', ['b'], [edge('b', 'c'), edge('c', 'b')])).toEqual([]);
  });
});

describe('blockedLabel', () => {
  it('is empty when nothing blocks', () => {
    expect(blockedLabel([])).toBe('');
  });

  it('names a single blocker', () => {
    expect(blockedLabel([{ id: '1', title: 'Buy paint' }])).toBe('Blocked by Buy paint');
  });

  it('counts the rest', () => {
    expect(
      blockedLabel([
        { id: '1', title: 'Buy paint' },
        { id: '2', title: 'Sand the fence' },
        { id: '3', title: 'Borrow brushes' },
      ])
    ).toBe('Blocked by Buy paint and 2 more');
  });
});
