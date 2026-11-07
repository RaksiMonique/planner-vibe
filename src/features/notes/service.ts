import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, notes } from '@/db/schema';
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

function toValues(input: NoteInput) {
  return {
    lifeSegmentId: input.lifeSegmentId,
    kind: input.kind,
    title: input.title || null,
    content: input.content,
    author: input.author || null,
    source: input.source || null,
    isPinned: input.isPinned,
  };
}

export async function createNote(userId: string, input: NoteInput): Promise<Note> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(notes)
    .values({ userId, ...toValues(input) })
    .returning();
  return row;
}

export async function updateNote(userId: string, id: string, input: NoteInput): Promise<Note> {
  await getNoteOrThrow(userId, id);
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const [row] = await db
    .update(notes)
    .set(toValues(input))
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

export async function removeNote(userId: string, id: string): Promise<void> {
  await getNoteOrThrow(userId, id);
  await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(and(eq(notes.userId, userId), eq(notes.id, id)));
}
