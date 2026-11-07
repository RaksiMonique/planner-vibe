import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { captures } from '@/db/schema';
import { createTask, type TaskContext } from '@/features/tasks/service';
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
      dueDate: capture.pinnedDate ?? undefined,
    },
    ctx
  );
  await markCaptureConverted(userId, id, 'task', task.id);
  return task;
}
