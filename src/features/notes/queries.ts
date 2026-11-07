import 'server-only';
import { and, asc, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, notes } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type Note = typeof notes.$inferSelect;
export type NoteRow = Note & { segment: SegmentRef };

export async function listNotes(
  userId: string,
  filters: { kind?: Note['kind']; lifeSegmentId?: string; pinnedFirst?: boolean } = {}
): Promise<NoteRow[]> {
  const conds = [eq(notes.userId, userId), isNull(notes.deletedAt)];
  if (filters.kind) conds.push(eq(notes.kind, filters.kind));
  if (filters.lifeSegmentId) conds.push(eq(notes.lifeSegmentId, filters.lifeSegmentId));
  const rows = await db
    .select({ note: notes, segment: segmentRefColumns })
    .from(notes)
    .innerJoin(lifeSegments, eq(notes.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(
      ...(filters.pinnedFirst ? [desc(notes.isPinned)] : []),
      desc(notes.updatedAt),
      asc(notes.createdAt)
    );
  return rows.map((r) => ({ ...r.note, segment: r.segment }));
}

/** The user's own quotes, for the dashboard inspiration card and the quotes page. */
export async function listQuotes(userId: string): Promise<NoteRow[]> {
  return listNotes(userId, { kind: 'quote', pinnedFirst: true });
}

/** Notes of one kind, optionally filtered by a search term over title, content, author and source. */
export async function searchNotes(
  userId: string,
  filters: { kind: Note['kind']; q?: string; lifeSegmentId?: string }
): Promise<NoteRow[]> {
  const conds = [eq(notes.userId, userId), isNull(notes.deletedAt), eq(notes.kind, filters.kind)];
  if (filters.lifeSegmentId) conds.push(eq(notes.lifeSegmentId, filters.lifeSegmentId));
  const q = filters.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conds.push(
      or(
        ilike(notes.title, like),
        ilike(notes.content, like),
        ilike(notes.author, like),
        ilike(notes.source, like)
      )!
    );
  }
  const rows = await db
    .select({ note: notes, segment: segmentRefColumns })
    .from(notes)
    .innerJoin(lifeSegments, eq(notes.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt), asc(notes.createdAt));
  return rows.map((r) => ({ ...r.note, segment: r.segment }));
}

export async function getNote(userId: string, id: string): Promise<NoteRow | null> {
  const [row] = await db
    .select({ note: notes, segment: segmentRefColumns })
    .from(notes)
    .innerJoin(lifeSegments, eq(notes.lifeSegmentId, lifeSegments.id))
    .where(and(eq(notes.userId, userId), eq(notes.id, id), isNull(notes.deletedAt)))
    .limit(1);
  return row ? { ...row.note, segment: row.segment } : null;
}
