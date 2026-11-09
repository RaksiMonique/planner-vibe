import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { goals, lifeSegments, projects, visionBoardItems, visionBoards } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import { signedImageUrls } from '@/lib/storage';

export type VisionBoard = typeof visionBoards.$inferSelect;
export type VisionBoardItem = typeof visionBoardItems.$inferSelect;
export type BoardRow = VisionBoard & {
  segment: SegmentRef;
  itemCount: number;
  coverUrl: string | null;
  goalTitle: string | null;
  projectTitle: string | null;
};
export type ItemRow = VisionBoardItem & { imageUrl: string | null };

export async function listBoards(userId: string): Promise<BoardRow[]> {
  const rows = await db
    .select({
      board: visionBoards,
      segment: segmentRefColumns,
      goalTitle: goals.title,
      projectTitle: projects.title,
    })
    .from(visionBoards)
    .innerJoin(lifeSegments, eq(visionBoards.lifeSegmentId, lifeSegments.id))
    .leftJoin(goals, eq(visionBoards.goalId, goals.id))
    .leftJoin(projects, eq(visionBoards.projectId, projects.id))
    .where(and(eq(visionBoards.userId, userId), isNull(visionBoards.deletedAt)))
    .orderBy(asc(visionBoards.sortOrder), asc(visionBoards.createdAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({ boardId: visionBoardItems.boardId, count: sql<number>`count(*)::int` })
    .from(visionBoardItems)
    .where(eq(visionBoardItems.userId, userId))
    .groupBy(visionBoardItems.boardId);
  const countById = new Map(counts.map((c) => [c.boardId, c.count]));
  const urls = await signedImageUrls(rows.map((r) => r.board.coverPath));
  return rows.map(({ board, segment, goalTitle, projectTitle }) => ({
    ...board,
    segment,
    itemCount: countById.get(board.id) ?? 0,
    coverUrl: board.coverPath ? (urls[board.coverPath] ?? null) : null,
    goalTitle,
    projectTitle,
  }));
}

export async function getBoard(userId: string, id: string): Promise<BoardRow | null> {
  const all = await listBoards(userId);
  return all.find((b) => b.id === id) ?? null;
}

export async function listBoardItems(userId: string, boardId: string): Promise<ItemRow[]> {
  const rows = await db
    .select()
    .from(visionBoardItems)
    .where(and(eq(visionBoardItems.userId, userId), eq(visionBoardItems.boardId, boardId)))
    .orderBy(asc(visionBoardItems.sortOrder), asc(visionBoardItems.createdAt));
  const urls = await signedImageUrls(rows.map((r) => r.imagePath));
  return rows.map((r) => ({ ...r, imageUrl: r.imagePath ? (urls[r.imagePath] ?? null) : null }));
}
