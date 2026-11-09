import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { goals, lifeSegments, projects, visionBoardItems, visionBoards } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { removeImage, uploadImage } from '@/lib/storage';
import type { VisionBoard, VisionBoardItem } from './queries';
import type { BoardInput, ItemInput } from './schema';

async function assertOwned(
  userId: string,
  input: { lifeSegmentId?: string; goalId?: string; projectId?: string }
) {
  if (input.lifeSegmentId) {
    const n = await db.$count(
      lifeSegments,
      and(eq(lifeSegments.id, input.lifeSegmentId), eq(lifeSegments.userId, userId))
    );
    if (n === 0) throw new ValidationError('That Life Segment does not exist.');
  }
  if (input.goalId) {
    const n = await db.$count(goals, and(eq(goals.id, input.goalId), eq(goals.userId, userId)));
    if (n === 0) throw new ValidationError('That goal does not exist.');
  }
  if (input.projectId) {
    const n = await db.$count(
      projects,
      and(eq(projects.id, input.projectId), eq(projects.userId, userId))
    );
    if (n === 0) throw new ValidationError('That project does not exist.');
  }
}

export async function getBoardOrThrow(userId: string, id: string): Promise<VisionBoard> {
  const [row] = await db
    .select()
    .from(visionBoards)
    .where(
      and(eq(visionBoards.userId, userId), eq(visionBoards.id, id), isNull(visionBoards.deletedAt))
    )
    .limit(1);
  if (!row) throw new NotFoundError('That board does not exist.');
  return row;
}

async function getItemOrThrow(userId: string, id: string): Promise<VisionBoardItem> {
  const [row] = await db
    .select()
    .from(visionBoardItems)
    .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That item does not exist.');
  return row;
}

function boardValues(input: BoardInput) {
  return {
    name: input.name,
    lifeSegmentId: input.lifeSegmentId,
    description: input.description || null,
    category: input.category || null,
    goalId: input.goalId ?? null,
    projectId: input.projectId ?? null,
  };
}

const hasFile = (f: File | null | undefined): f is File => !!f && f.size > 0;

export async function createBoard(
  userId: string,
  input: BoardInput,
  cover?: File | null
): Promise<VisionBoard> {
  await assertOwned(userId, input);
  const coverPath = hasFile(cover) ? await uploadImage(userId, 'vision', cover) : null;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${visionBoards.sortOrder}), -1)::int` })
    .from(visionBoards)
    .where(eq(visionBoards.userId, userId));
  const [row] = await db
    .insert(visionBoards)
    .values({ userId, ...boardValues(input), coverPath, sortOrder: max + 1 })
    .returning();
  return row;
}

export async function updateBoard(
  userId: string,
  id: string,
  input: BoardInput,
  cover?: File | null
) {
  const current = await getBoardOrThrow(userId, id);
  await assertOwned(userId, input);
  let coverPath = current.coverPath;
  if (hasFile(cover)) {
    coverPath = await uploadImage(userId, 'vision', cover);
    await removeImage(userId, current.coverPath);
  }
  await db
    .update(visionBoards)
    .set({ ...boardValues(input), coverPath })
    .where(and(eq(visionBoards.userId, userId), eq(visionBoards.id, id)));
}

export async function clearBoardCover(userId: string, id: string) {
  const current = await getBoardOrThrow(userId, id);
  await removeImage(userId, current.coverPath);
  await db
    .update(visionBoards)
    .set({ coverPath: null })
    .where(and(eq(visionBoards.userId, userId), eq(visionBoards.id, id)));
}

/** Soft-deletes the board and removes every stored image it owns. */
export async function removeBoard(userId: string, id: string) {
  const board = await getBoardOrThrow(userId, id);
  const items = await db
    .select({ imagePath: visionBoardItems.imagePath })
    .from(visionBoardItems)
    .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.boardId, id)));
  await Promise.all([
    removeImage(userId, board.coverPath),
    ...items.map((i) => removeImage(userId, i.imagePath)),
  ]);
  await db
    .delete(visionBoardItems)
    .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.boardId, id)));
  await db
    .update(visionBoards)
    .set({ deletedAt: new Date(), coverPath: null })
    .where(and(eq(visionBoards.userId, userId), eq(visionBoards.id, id)));
}

export async function addItem(
  userId: string,
  boardId: string,
  input: ItemInput,
  image?: File | null
): Promise<VisionBoardItem> {
  await getBoardOrThrow(userId, boardId);
  await assertOwned(userId, input);
  if (input.kind === 'image' && !hasFile(image))
    throw new ValidationError('Choose an image to upload.');
  const imagePath =
    input.kind === 'image' && hasFile(image) ? await uploadImage(userId, 'vision', image) : null;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${visionBoardItems.sortOrder}), -1)::int` })
    .from(visionBoardItems)
    .where(eq(visionBoardItems.boardId, boardId));
  const [row] = await db
    .insert(visionBoardItems)
    .values({
      userId,
      boardId,
      kind: input.kind,
      imagePath,
      url: input.url || null,
      caption: input.caption || null,
      quoteText: input.kind === 'quote' ? (input.quoteText ?? null) : null,
      author: input.kind === 'quote' ? input.author || null : null,
      goalId: input.goalId ?? null,
      projectId: input.projectId ?? null,
      sortOrder: max + 1,
    })
    .returning();
  return row;
}

export async function updateCaption(userId: string, id: string, caption: string | undefined) {
  await getItemOrThrow(userId, id);
  await db
    .update(visionBoardItems)
    .set({ caption: caption || null })
    .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.id, id)));
}

/** Swaps sort order with the neighbour in the given direction. */
export async function moveItem(userId: string, id: string, direction: 'left' | 'right') {
  const item = await getItemOrThrow(userId, id);
  const siblings = await db
    .select({ id: visionBoardItems.id, sortOrder: visionBoardItems.sortOrder })
    .from(visionBoardItems)
    .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.boardId, item.boardId)))
    .orderBy(visionBoardItems.sortOrder, visionBoardItems.createdAt);
  const index = siblings.findIndex((s) => s.id === id);
  const target = direction === 'left' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return;
  // Normalise to positions first so swaps are stable even with duplicate orders.
  const order = siblings.map((s) => s.id);
  [order[index], order[target]] = [order[target], order[index]];
  await Promise.all(
    order.map((itemId, position) =>
      db
        .update(visionBoardItems)
        .set({ sortOrder: position })
        .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.id, itemId)))
    )
  );
}

export async function removeItem(userId: string, id: string) {
  const item = await getItemOrThrow(userId, id);
  await removeImage(userId, item.imagePath);
  await db
    .delete(visionBoardItems)
    .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.id, id)));
}
