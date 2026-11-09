import { describe, expect, it } from 'vitest';
import { findBook, formatReference, parseReference } from './references';

describe('findBook', () => {
  it('matches names, abbreviations, aliases and ordinals', () => {
    expect(findBook('John')?.id).toBe(50);
    expect(findBook('Jn')?.id).toBe(50);
    expect(findBook('1 Cor')?.id).toBe(53);
    expect(findBook('1Cor')?.id).toBe(53);
    expect(findBook('II Samuel')?.id).toBe(10);
    expect(findBook('First John')?.id).toBe(69);
    expect(findBook('Psalm')?.id).toBe(23);
    expect(findBook('Revelations')?.id).toBe(73);
    expect(findBook('Song of Solomon')?.id).toBe(26);
  });
  it('accepts unambiguous prefixes only', () => {
    expect(findBook('Deut')?.id).toBe(5);
    expect(findBook('Matt')?.id).toBe(47);
    expect(findBook('Jo')).toBeUndefined();
    expect(findBook('Xyz')).toBeUndefined();
  });
});

describe('parseReference', () => {
  it('parses chapters, verses and ranges', () => {
    expect(parseReference('John 3:1-21')).toEqual({
      bookId: 50,
      chapter: 3,
      verseStart: 1,
      verseEnd: 21,
      chapterEnd: null,
    });
    expect(parseReference('1 Cor 13')).toMatchObject({ bookId: 53, chapter: 13, verseStart: null });
    expect(parseReference('Ps 23:1')).toMatchObject({
      bookId: 23,
      chapter: 23,
      verseStart: 1,
      verseEnd: null,
    });
    expect(parseReference('Gn 1-2')).toMatchObject({ bookId: 1, chapter: 1, chapterEnd: 2 });
    expect(parseReference('Mt 5:3–7:29')).toMatchObject({
      chapter: 5,
      verseStart: 3,
      chapterEnd: 7,
      verseEnd: 29,
    });
  });
  it('treats single-chapter books as verses', () => {
    expect(parseReference('Jude 3')).toMatchObject({ bookId: 72, chapter: 1, verseStart: 3 });
    expect(parseReference('Philemon 4-7')).toMatchObject({
      bookId: 64,
      chapter: 1,
      verseStart: 4,
      verseEnd: 7,
    });
    expect(parseReference('Obadiah')).toMatchObject({ bookId: 38, chapter: 1, verseStart: null });
    expect(parseReference('Jude 1:3-5')).toMatchObject({
      bookId: 72,
      chapter: 1,
      verseStart: 3,
      verseEnd: 5,
    });
  });
  it('rejects nonsense', () => {
    expect(parseReference('John')).toBeNull();
    expect(parseReference('John 99')).toBeNull();
    expect(parseReference('John 3:10-2')).toBeNull();
    expect(parseReference('Nowhere 1:1')).toBeNull();
    expect(parseReference('')).toBeNull();
  });
});

describe('formatReference', () => {
  it('round-trips the common shapes', () => {
    for (const text of [
      'John 3:1-21',
      'John 3',
      'Genesis 1-2',
      'Matthew 5:3-7:29',
      'Jude 3-5',
      'Psalms 23:1',
    ]) {
      expect(formatReference(parseReference(text)!)).toBe(text);
    }
  });
});
