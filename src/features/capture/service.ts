import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { captures } from '@/db/schema';
import { createTask, type TaskContext } from '@/features/tasks/service';
import { createNote } from '@/features/notes/service';
import { parseTags } from '@/features/notes/tags';
import { NotFoundError } from '@/lib/errors';
import type { Capture } from './queries';

export async function addCapture(userId: string, text: string): Promise<Capture> {
  const [row] = await db.insert(captures).values({ userId, text }).returning();
  return row;
}

export async function getCaptureOrThrow(userId: string, id: string): Promise<Capture> {
  const [row] = await db
    .select()
    .from(captures)
    .where(and(eq(captures.userId, userId), eq(captures.id, id), isNull(captures.convertedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That capture is no longer in the Inbox.');
  return row;
}

export async function removeCapture(userId: string, id: string): Promise<void> {
  await db.delete(captures).where(and(eq(captures.userId, userId), eq(captures.id, id)));
}

/**
 * Records what a capture became. Other features call this after creating
 * the task, note or event from an Inbox item (instructions.md 7.6).
 */
export async function markCaptureConverted(
  userId: string,
  id: string,
  entityType: 'task' | 'note' | 'event',
  entityId: string
): Promise<void> {
  await db
    .update(captures)
    .set({
      kind: entityType,
      convertedEntityType: entityType,
      convertedEntityId: entityId,
      convertedAt: new Date(),
    })
    .where(and(eq(captures.userId, userId), eq(captures.id, id)));
}

export async function convertCaptureToTask(
  userId: string,
  id: string,
  lifeSegmentId: string,
  ctx: TaskContext,
  title?: string
) {
  const capture = await getCaptureOrThrow(userId, id);
  const task = await createTask(
    userId,
    {
      title: (title ?? capture.text).slice(0, 200),
      notes: title && title !== capture.text ? capture.text : undefined,
      lifeSegmentId,
      priority: 'medium',
      isImportant: false,
      status: 'todo',
      recurrence: 'none',
      recurrenceInterval: 1,
      recurrenceDays: [],
      recurrenceMonthly: 'day',
      recurrenceEnd: 'never',
      reminder: 'none',
      blockedByIds: [],
      dueDate: capture.pinnedDate ?? undefined,
    },
    ctx
  );
  await markCaptureConverted(userId, id, 'task', task.id);
  return task;
}

/**
 * The capture's text becomes the body of a note or quote in the chosen
 * segment. A quote takes its author, source, why and tags in the same step,
 * so nothing is saved without the reason it mattered.
 */
export async function convertCaptureToNote(
  userId: string,
  id: string,
  lifeSegmentId: string,
  extras: {
    kind?: 'note' | 'quote';
    author?: string;
    source?: string;
    why?: string;
    tags?: string;
  } = {}
) {
  const capture = await getCaptureOrThrow(userId, id);
  const note = await createNote(userId, {
    lifeSegmentId,
    kind: extras.kind ?? 'note',
    content: capture.text,
    author: extras.author,
    source: extras.source,
    why: extras.why,
    tags: parseTags(extras.tags),
    isPinned: false,
  });
  await markCaptureConverted(userId, id, 'note', note.id);
  return note;
}

/** Sticky notes are captures pinned to a day (instructions.md 7.6). */
export async function addPinnedCapture(
  userId: string,
  text: string,
  pinnedDate: string
): Promise<Capture> {
  const [row] = await db.insert(captures).values({ userId, text, pinnedDate }).returning();
  return row;
}

/** Unpins a sticky note; it stays in the Inbox as an ordinary capture. */
export async function setCapturePinnedDate(
  userId: string,
  id: string,
  pinnedDate: string | null
): Promise<void> {
  await getCaptureOrThrow(userId, id);
  await db
    .update(captures)
    .set({ pinnedDate })
    .where(and(eq(captures.userId, userId), eq(captures.id, id)));
}
