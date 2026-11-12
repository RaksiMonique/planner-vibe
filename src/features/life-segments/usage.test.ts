import { describe, expect, it } from 'vitest';
import { orderByUsage } from './usage';

const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('orderByUsage', () => {
  it('puts the most used rows first', () => {
    const out = orderByUsage(
      rows,
      new Map([
        ['c', 5],
        ['a', 2],
        ['d', 9],
      ])
    );
    expect(out.map((r) => r.id)).toEqual(['d', 'c', 'a', 'b']);
  });

  it('keeps the incoming order between rows used equally often', () => {
    const out = orderByUsage(
      rows,
      new Map([
        ['b', 1],
        ['d', 1],
      ])
    );
    expect(out.map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('leaves the order alone when nothing is used', () => {
    expect(orderByUsage(rows, new Map())).toEqual(rows);
  });
});
