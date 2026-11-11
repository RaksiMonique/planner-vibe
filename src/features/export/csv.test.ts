import { describe, expect, it } from 'vitest';
import { escapeCell, formatCell, toCsv } from './csv';

describe('toCsv', () => {
  it('writes a header from the keys and quotes what needs quoting', () => {
    const csv = toCsv([
      { id: '1', title: 'Plain', note: null },
      { id: '2', title: 'Has, comma', note: 'Says "hi"\nand more' },
    ]);
    expect(csv.split('\n')).toEqual([
      'id,title,note',
      '1,Plain,',
      '2,"Has, comma","Says ""hi""\nand more"'.split('\n')[0],
      'and more"',
      '',
    ]);
  });

  it('formats dates as ISO and objects as JSON', () => {
    expect(formatCell(new Date('2026-11-10T09:00:00.000Z'))).toBe('2026-11-10T09:00:00.000Z');
    expect(formatCell({ a: 1 })).toBe('{"a":1}');
    expect(formatCell(undefined)).toBe('');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCell('-5')).toBe("'-5");
  });

  it('keeps a stable column order when given one', () => {
    expect(toCsv([{ b: 2, a: 1 }], ['a', 'b'])).toBe('a,b\n1,2\n');
    expect(toCsv([], ['a', 'b'])).toBe('a,b\n');
  });
});
