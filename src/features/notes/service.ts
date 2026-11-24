import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, mediaItems, notes } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { Note } from './queries';
import type { NoteInput } from './schema';

export async function getNoteOrThrow(userId: string, id: string): Promise<Note> {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.id, id), isNull(notes.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That note does not exist.');
  return row;
}

async function assertSegmentOwned(userId: string, lifeSegmentId: string) {
  const count = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (count === 0) throw new ValidationError('That Life Segment does not exist.');
}

/** The media item a note comes from, when one is chosen; it must be the user's. */
async function sourceItem(userId: string, mediaItemId: string | undefined) {
  if (!mediaItemId) return null;
  const [row] = await db
    .select({ id: mediaItems.id, title: mediaItems.title, creator: mediaItems.creator })
    .from(mediaItems)
    .where(
      and(
        eq(mediaItems.id, mediaItemId),
        eq(mediaItems.userId, userId),
        isNull(mediaItems.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new ValidationError('That item is not in your media tracker any more.');
  return row;
}

/**
 * Column values from the form. A chosen source item fills in the source and
 * author when those were left blank, so a quote from a book is attributed
 * without typing the title twice.
 */
async function toValues(userId: string, input: NoteInput) {
  const item = await sourceItem(userId, input.mediaItemId);
  return {
    lifeSegmentId: input.lifeSegmentId,
    kind: input.kind,
    title: input.title || null,
    content: input.content,
    author: input.author || item?.creator || null,
    source: input.source || item?.title || null,
    mediaItemId: item?.id ?? null,
    why: input.why || null,
    tags: input.tags,
    isPinned: input.isPinned,
  };
}

export async function createNote(userId: string, input: NoteInput): Promise<Note> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const values = await toValues(userId, input);
  const [row] = await db
    .insert(notes)
    .values({ userId, ...values })
    .returning();
  return row;
}

export async function updateNote(userId: string, id: string, input: NoteInput): Promise<Note> {
  await getNoteOrThrow(userId, id);
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const values = await toValues(userId, input);
  const [row] = await db
    .update(notes)
    .set(values)
    .where(and(eq(notes.userId, userId), eq(notes.id, id)))
    .returning();
  return row;
}

export async function setNotePinned(userId: string, id: string, isPinned: boolean): Promise<void> {
  await getNoteOrThrow(userId, id);
  await db
    .update(notes)
    .set({ isPinned })
    .where(and(eq(notes.userId, userId), eq(notes.id, id)));
}

/** "Still useful? Keep." A kept note counts as touched today and leaves the review pile. */
export async function touchNote(userId: string, id: string): Promise<void> {
  await getNoteOrThrow(userId, id);
  await db
    .update(notes)
    .set({ updatedAt: new Date() })
    .where(and(eq(notes.userId, userId), eq(notes.id, id)));
}

export async function removeNote(userId: string, id: string): Promise<void> {
  await getNoteOrThrow(userId, id);
  await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(and(eq(notes.userId, userId), eq(notes.id, id)));
}
