import { describe, expect, it } from 'vitest';
import { buildAncestorChain, groupGoalsByHorizon } from './grouping';

describe('groupGoalsByHorizon', () => {
  it('orders lifelong first and drops empty horizons', () => {
    const groups = groupGoalsByHorizon([
      { id: 'w', horizon: 'weekly' as const },
      { id: 'l', horizon: 'lifelong' as const },
      { id: 'q', horizon: 'quarterly' as const },
    ]);
    expect(groups.map((g) => g.horizon)).toEqual(['lifelong', 'quarterly', 'weekly']);
    expect(groups[0].goals.map((g) => g.id)).toEqual(['l']);
  });
});

describe('buildAncestorChain', () => {
  const all = [
    { id: 'life', parentGoalId: null },
    { id: 'year', parentGoalId: 'life' },
    { id: 'quarter', parentGoalId: 'year' },
    { id: 'orphan', parentGoalId: 'missing' },
    { id: 'a', parentGoalId: 'b' },
    { id: 'b', parentGoalId: 'a' },
  ];
  it('walks from the root down to the parent', () => {
    expect(buildAncestorChain('quarter', all).map((g) => g.id)).toEqual(['life', 'year']);
    expect(buildAncestorChain('life', all)).toEqual([]);
  });
  it('stops at missing parents and cycles', () => {
    expect(buildAncestorChain('orphan', all)).toEqual([]);
    expect(buildAncestorChain('a', all).map((g) => g.id)).toEqual(['b']);
  });
});
