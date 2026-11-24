import { describe, expect, it } from 'vitest';
import { cellsLeft, fillerSpanClasses } from './segment-tiles';

describe('cellsLeft', () => {
  it('fills the gap at the end of a part row', () => {
    expect(cellsLeft(10, 3)).toBe(2);
    expect(cellsLeft(9, 5)).toBe(1);
    expect(cellsLeft(7, 2)).toBe(1);
  });

  it('takes a whole new row when the last row is full', () => {
    expect(cellsLeft(10, 2)).toBe(2);
    expect(cellsLeft(10, 5)).toBe(5);
    expect(cellsLeft(0, 3)).toBe(3);
  });
});

describe('fillerSpanClasses', () => {
  it('takes a whole row at every width after ten defaults on a phone, part rows elsewhere', () => {
    expect(fillerSpanClasses(10)).toBe('col-span-2 sm:col-span-2 lg:col-span-5');
  });

  it('fills the four cells eleven segments leave on a laptop', () => {
    expect(fillerSpanClasses(11)).toBe('col-span-1 sm:col-span-1 lg:col-span-4');
  });

  it('spans the remaining cells for a part row', () => {
    expect(fillerSpanClasses(7)).toBe('col-span-1 sm:col-span-2 lg:col-span-3');
  });
});
