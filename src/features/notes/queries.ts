import 'server-only';
import { and, asc, desc, eq, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, mediaItems, notes } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import { rankTags } from './tags';

export type Note = typeof notes.$inferSelect;
export type NoteRow = Note & {
  segment: SegmentRef;
  sourceItem: { id: string; title: string } | null;
};

/** Notes untouched for this long and never pinned are offered for review. */
export const STALE_AFTER_DAYS = 90;

const sourceItemColumns = { id: mediaItems.id, title: mediaItems.title };

function baseSelect() {
  return db
    .select({ note: notes, segment: segmentRefColumns, sourceItem: sourceItemColumns })
    .from(notes)
    .innerJoin(lifeSegments, eq(notes.lifeSegmentId, lifeSegments.id))
    .leftJoin(mediaItems, eq(notes.mediaItemId, mediaItems.id));
}

type Joined = { note: Note; segment: SegmentRef; sourceItem: { id: string; title: string } | null };
const toRow = (r: Joined): NoteRow => ({
  ...r.note,
  segment: r.segment,
  sourceItem: r.sourceItem?.id ? r.sourceItem : null,
});

function staleCondition(now = new Date()) {
  const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  return and(eq(notes.isPinned, false), lt(notes.updatedAt, cutoff))!;
}

export async function listNotes(
  userId: string,
  filters: { kind?: Note['kind']; lifeSegmentId?: string; pinnedFirst?: boolean } = {}
): Promise<NoteRow[]> {
  const conds = [eq(notes.userId, userId), isNull(notes.deletedAt)];
  if (filters.kind) conds.push(eq(notes.kind, filters.kind));
  if (filters.lifeSegmentId) conds.push(eq(notes.lifeSegmentId, filters.lifeSegmentId));
  const rows = await baseSelect()
    .where(and(...conds))
    .orderBy(
      ...(filters.pinnedFirst ? [desc(notes.isPinned)] : []),
      desc(notes.updatedAt),
      asc(notes.createdAt)
    );
  return rows.map(toRow);
}

/** The user's own quotes, for the dashboard inspiration card and the quotes page. */
export async function listQuotes(userId: string): Promise<NoteRow[]> {
  return listNotes(userId, { kind: 'quote', pinnedFirst: true });
}

export type NoteSearch = {
  kind: Note['kind'];
  q?: string;
  lifeSegmentId?: string;
  /** Exact tag, lower-case. */
  tag?: string;
  /** Only notes untouched for STALE_AFTER_DAYS and never pinned. */
  stale?: boolean;
};

/** Notes of one kind, filtered by a search term over title, content, author, source, why and tags. */
export async function searchNotes(userId: string, filters: NoteSearch): Promise<NoteRow[]> {
  const conds = [eq(notes.userId, userId), isNull(notes.deletedAt), eq(notes.kind, filters.kind)];
  if (filters.lifeSegmentId) conds.push(eq(notes.lifeSegmentId, filters.lifeSegmentId));
  if (filters.tag) conds.push(sql`${notes.tags} @> ARRAY[${filters.tag}]::text[]`);
  if (filters.stale) conds.push(staleCondition());
  const q = filters.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conds.push(
      or(
        ilike(notes.title, like),
        ilike(notes.content, like),
        ilike(notes.author, like),
        ilike(notes.source, like),
        ilike(notes.why, like),
        ilike(sql`array_to_string(${notes.tags}, ' ')`, like)
      )!
    );
  }
  const rows = await baseSelect()
    .where(and(...conds))
    .orderBy(
      ...(filters.stale ? [asc(notes.updatedAt)] : [desc(notes.isPinned), desc(notes.updatedAt)]),
      asc(notes.createdAt)
    );
  return rows.map(toRow);
}

export async function getNote(userId: string, id: string): Promise<NoteRow | null> {
  const [row] = await baseSelect()
    .where(and(eq(notes.userId, userId), eq(notes.id, id), isNull(notes.deletedAt)))
    .limit(1);
  return row ? toRow(row) : null;
}

/** Pinned notes first, then the most recently edited, capped for the dashboard preview. */
export async function listRecentNotes(
  userId: string,
  kind: Note['kind'],
  limit: number
): Promise<NoteRow[]> {
  const rows = await baseSelect()
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt), eq(notes.kind, kind)))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt), asc(notes.createdAt))
    .limit(limit);
  return rows.map(toRow);
}

export async function countNotes(userId: string, kind: Note['kind']): Promise<number> {
  return db.$count(
    notes,
    and(eq(notes.userId, userId), isNull(notes.deletedAt), eq(notes.kind, kind))
  );
}

export async function countStaleNotes(userId: string, kind: Note['kind']): Promise<number> {
  return db.$count(
    notes,
    and(eq(notes.userId, userId), isNull(notes.deletedAt), eq(notes.kind, kind), staleCondition())
  );
}

/** Every tag the user has used on this kind, most used first. */
export async function listTags(
  userId: string,
  kind?: Note['kind']
): Promise<Array<{ tag: string; count: number }>> {
  const conds = [eq(notes.userId, userId), isNull(notes.deletedAt)];
  if (kind) conds.push(eq(notes.kind, kind));
  const rows = await db
    .select({ tags: notes.tags })
    .from(notes)
    .where(and(...conds));
  return rankTags(rows);
}

/** Notes and quotes taken from one media item, quotes first. */
export async function listNotesForMediaItem(
  userId: string,
  mediaItemId: string
): Promise<NoteRow[]> {
  const rows = await baseSelect()
    .where(
      and(eq(notes.userId, userId), isNull(notes.deletedAt), eq(notes.mediaItemId, mediaItemId))
    )
    .orderBy(desc(notes.kind), desc(notes.isPinned), desc(notes.updatedAt), asc(notes.createdAt));
  return rows.map(toRow);
}

export type SourceItemOption = { id: string; title: string; kind: string };

/** Media items a note can name as its source: books first, then the rest, by title. */
export async function listSourceItemOptions(userId: string): Promise<SourceItemOption[]> {
  return db
    .select({ id: mediaItems.id, title: mediaItems.title, kind: mediaItems.kind })
    .from(mediaItems)
    .where(and(eq(mediaItems.userId, userId), isNull(mediaItems.deletedAt)))
    .orderBy(sql`case when ${mediaItems.kind} = 'book' then 0 else 1 end`, asc(mediaItems.title));
}
