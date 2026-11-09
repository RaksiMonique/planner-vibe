import { BIBLE_BOOKS, bookById, type BibleBookRef } from './bible-books';

/** A passage as book, chapter and optional verse or chapter range. Never the text. */
export type ParsedReference = {
  bookId: number;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  /** Set when the passage runs into a later chapter. */
  chapterEnd: number | null;
};

const EXTRA_ALIASES: Record<string, number> = {
  psalm: 23,
  psalter: 23,
  song: 26,
  'song of solomon': 26,
  canticles: 26,
  'canticle of canticles': 26,
  qoheleth: 25,
  ecclesiasticus: 28,
  'ben sira': 28,
  acts: 51,
  apocalypse: 73,
  revelations: 73,
};

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3' };
const WORDS: Record<string, string> = { first: '1', second: '2', third: '3' };

function normalise(s: string): string {
  return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

/** "ii samuel", "1cor", "first john" → "2 samuel", "1 cor", "1 john". */
function normaliseOrdinal(key: string): string {
  return key
    .replace(/^(\d)(?=[a-z])/, '$1 ')
    .replace(/^(i{1,3})\s+/, (_, r: string) => `${ROMAN[r]} `)
    .replace(/^(first|second|third)\s+/, (_, w: string) => `${WORDS[w]} `);
}

const INDEX: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const b of BIBLE_BOOKS) {
    m.set(normalise(b.name), b.id);
    m.set(normalise(b.abbreviation), b.id);
  }
  for (const [k, v] of Object.entries(EXTRA_ALIASES)) m.set(k, v);
  return m;
})();

/** Finds a book by full name, NABRE abbreviation, common alias or an unambiguous prefix. */
export function findBook(name: string): BibleBookRef | undefined {
  const key = normaliseOrdinal(normalise(name));
  if (!key) return undefined;
  const exact = INDEX.get(key);
  if (exact) return bookById(exact);
  if (key.length < 3) return undefined;
  const matches = BIBLE_BOOKS.filter((b) => normalise(b.name).startsWith(key));
  return matches.length === 1 ? matches[0] : undefined;
}

const PATTERN =
  /^\s*((?:\d|i{1,3}|first|second|third)\s*)?([a-z][a-z .]*?)\s*(?:(\d+)(?::(\d+))?(?:\s*[-–—]\s*(\d+)(?::(\d+))?)?)?\s*$/i;

/**
 * Parses "John 3:1-21", "1 Cor 13", "Ps 23:1", "Gn 1-2", "Mt 5:3-7:29" or
 * "Jude 3" (single-chapter books take verses directly). Returns null when the
 * book is unknown, the chapter is out of range or no chapter is given for a
 * multi-chapter book.
 */
export function parseReference(text: string): ParsedReference | null {
  const m = PATTERN.exec(text);
  if (!m) return null;
  const [, ordinal, name, a, b, c, d] = m;
  const book = findBook(`${ordinal ?? ''}${name}`);
  if (!book) return null;
  const n = (v: string | undefined) => (v === undefined ? null : Number(v));
  const first = n(a);
  const second = n(b);
  const third = n(c);
  const fourth = n(d);

  if (book.chapters === 1) {
    // "Jude" | "Jude 3" | "Jude 3-5"
    if (first === null)
      return { bookId: book.id, chapter: 1, verseStart: null, verseEnd: null, chapterEnd: null };
    if (second !== null) {
      // "Jude 1:3" or "Jude 1:3-5"
      if (first !== 1) return null;
      return check(
        {
          bookId: book.id,
          chapter: 1,
          verseStart: second,
          verseEnd: fourth ?? third,
          chapterEnd: null,
        },
        book
      );
    }
    return check(
      { bookId: book.id, chapter: 1, verseStart: first, verseEnd: third, chapterEnd: null },
      book
    );
  }
  if (first === null) return null;
  if (second === null) {
    // "John 3" or "John 3-4"
    return check(
      { bookId: book.id, chapter: first, verseStart: null, verseEnd: null, chapterEnd: third },
      book
    );
  }
  if (third === null) {
    return check(
      { bookId: book.id, chapter: first, verseStart: second, verseEnd: null, chapterEnd: null },
      book
    );
  }
  if (fourth === null) {
    // "John 3:1-21"
    return check(
      { bookId: book.id, chapter: first, verseStart: second, verseEnd: third, chapterEnd: null },
      book
    );
  }
  // "John 3:16-4:2"
  return check(
    { bookId: book.id, chapter: first, verseStart: second, verseEnd: fourth, chapterEnd: third },
    book
  );
}

function check(ref: ParsedReference, book: BibleBookRef): ParsedReference | null {
  if (ref.chapter < 1 || ref.chapter > book.chapters) return null;
  if (ref.chapterEnd !== null) {
    if (ref.chapterEnd === ref.chapter) ref = { ...ref, chapterEnd: null };
    else if (ref.chapterEnd < ref.chapter || ref.chapterEnd > book.chapters) return null;
  }
  if (ref.verseStart !== null && ref.verseStart < 1) return null;
  if (ref.verseEnd !== null) {
    if (ref.verseStart === null) return null;
    if (ref.chapterEnd === null && ref.verseEnd < ref.verseStart) return null;
    if (ref.chapterEnd === null && ref.verseEnd === ref.verseStart)
      ref = { ...ref, verseEnd: null };
  }
  return ref;
}

/** "John 3:1-21", "John 3", "John 3-4", "John 3:16-4:2", "Jude 3-5". */
export function formatReference(ref: ParsedReference): string {
  const book = bookById(ref.bookId);
  if (!book) return '';
  if (book.chapters === 1) {
    if (ref.verseStart === null) return book.name;
    return `${book.name} ${ref.verseStart}${ref.verseEnd !== null ? `-${ref.verseEnd}` : ''}`;
  }
  let out = `${book.name} ${ref.chapter}`;
  if (ref.verseStart !== null) out += `:${ref.verseStart}`;
  if (ref.chapterEnd !== null) {
    out += `-${ref.chapterEnd}`;
    if (ref.verseEnd !== null) out += `:${ref.verseEnd}`;
  } else if (ref.verseEnd !== null) {
    out += `-${ref.verseEnd}`;
  }
  return out;
}
