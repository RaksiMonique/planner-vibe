import { describe, expect, it } from 'vitest';
import { noteHeading, relativeDayLabel } from './recency';

describe('relativeDayLabel', () => {
  it('names today and yesterday', () => {
    expect(relativeDayLabel('2026-11-19', '2026-11-19')).toBe('today');
    expect(relativeDayLabel('2026-11-18', '2026-11-19')).toBe('yesterday');
  });
  it('shows the day and month for anything older', () => {
    expect(relativeDayLabel('2026-11-03', '2026-11-19')).toBe('3 Nov');
    expect(relativeDayLabel('2025-12-31', '2026-11-19')).toBe('31 Dec');
  });
  it('treats a future key as today rather than a negative gap', () => {
    expect(relativeDayLabel('2026-11-20', '2026-11-19')).toBe('today');
  });
});

describe('noteHeading', () => {
  it('prefers the title', () => {
    expect(noteHeading({ title: 'Packing list', content: 'Socks\nShoes' })).toBe('Packing list');
  });
  it('falls back to the first non-blank line of the content', () => {
    expect(noteHeading({ title: null, content: '\n\n  Call the plumber  \nTomorrow' })).toBe(
      'Call the plumber'
    );
    expect(noteHeading({ title: '  ', content: 'Only line' })).toBe('Only line');
  });
  it('trims long headings with an ellipsis and never returns empty', () => {
    expect(noteHeading({ title: null, content: 'a'.repeat(80) }, 10)).toBe('aaaaaaaaa…');
    expect(noteHeading({ title: null, content: '   ' })).toBe('Untitled note');
  });
});
