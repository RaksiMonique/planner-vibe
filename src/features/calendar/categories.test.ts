import { describe, expect, it } from 'vitest';
import { categoryChoices, categoryLabel, normalizeCategory } from './categories';

describe('normalizeCategory', () => {
  it('keeps a new label, tidied', () => {
    expect(normalizeCategory('  Dentist   visits ')).toBe('Dentist visits');
  });

  it('folds built-in labels and keys onto the key', () => {
    expect(normalizeCategory('Work')).toBe('work');
    expect(normalizeCategory('self-care')).toBe('self_care');
    expect(normalizeCategory('SELF_CARE')).toBe('self_care');
  });

  it('falls back to general when empty', () => {
    expect(normalizeCategory('   ')).toBe('general');
  });
});

describe('categoryLabel', () => {
  it('labels built-ins and echoes custom names', () => {
    expect(categoryLabel('self_care')).toBe('Self-care');
    expect(categoryLabel('Dentist')).toBe('Dentist');
  });
});

describe('categoryChoices', () => {
  it('lists built-ins first and custom names once', () => {
    expect(categoryChoices(['Dentist', 'work', 'Dentist'])).toEqual([
      'general',
      'appointment',
      'self_care',
      'work',
      'other',
      'Dentist',
    ]);
  });
});
