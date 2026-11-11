import { describe, expect, it } from 'vitest';
import { buildMandala } from './mandala';

describe('buildMandala', () => {
  it('puts the goal in the middle and fills edges before corners', () => {
    const { cells, overflow } = buildMandala('c', ['a', 'b', 'd', 'e']);
    expect(cells[4]).toMatchObject({ goal: 'c', isCenter: true });
    expect(cells.map((x) => x.goal)).toEqual([null, 'a', null, 'e', 'c', 'b', null, 'd', null]);
    expect(overflow).toEqual([]);
  });

  it('keeps children beyond eight as overflow', () => {
    const kids = Array.from({ length: 10 }, (_, i) => `k${i}`);
    const { cells, overflow } = buildMandala('c', kids);
    expect(cells.filter((x) => x.goal && !x.isCenter)).toHaveLength(8);
    expect(overflow).toEqual(['k8', 'k9']);
  });
});
