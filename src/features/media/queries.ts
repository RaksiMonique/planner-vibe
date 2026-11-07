import 'server-only';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, mediaItems, mediaListItems, mediaLists, mediaLogs } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type MediaItem = typeof mediaItems.$inferSelect;
export type MediaLog = typeof mediaLogs.$inferSelect;

export async function listMediaItems(
  userId: string,
  filters: { kind?: MediaItem['kind']; status?: MediaItem['status']; lifeSegmentId?: string } = {}
): Promise<MediaItem[]> {
  const conds = [eq(mediaItems.userId, userId), isNull(mediaItems.deletedAt)];
  if (filters.kind) conds.push(eq(mediaItems.kind, filters.kind));
  if (filters.status) conds.push(eq(mediaItems.status, filters.status));
  if (filters.lifeSegmentId) conds.push(eq(mediaItems.lifeSegmentId, filters.lifeSegmentId));
  return db
    .select()
    .from(mediaItems)
    .where(and(...conds))
    .orderBy(desc(mediaItems.isFavourite), asc(mediaItems.status), desc(mediaItems.updatedAt));
}

export async function listMediaLogs(userId: string, mediaItemId: string): Promise<MediaLog[]> {
  return db
    .select()
    .from(mediaLogs)
    .where(and(eq(mediaLogs.userId, userId), eq(mediaLogs.mediaItemId, mediaItemId)))
    .orderBy(desc(mediaLogs.date), desc(mediaLogs.createdAt));
}

export type MediaList = typeof mediaLists.$inferSelect;
export type MediaItemRow = MediaItem & { segment: SegmentRef | null; logCount: number };
export type MediaListRow = MediaList & { items: MediaItem[] };

/** Items with their segment and how many logs they have. */
export async function listMediaRows(
  userId: string,
  filters: { kind?: MediaItem['kind']; status?: MediaItem['status']; lifeSegmentId?: string } = {}
): Promise<MediaItemRow[]> {
  const conds = [eq(mediaItems.userId, userId), isNull(mediaItems.deletedAt)];
  if (filters.kind) conds.push(eq(mediaItems.kind, filters.kind));
  if (filters.status) conds.push(eq(mediaItems.status, filters.status));
  if (filters.lifeSegmentId) conds.push(eq(mediaItems.lifeSegmentId, filters.lifeSegmentId));
  const rows = await db
    .select({ item: mediaItems, segment: segmentRefColumns })
    .from(mediaItems)
    .leftJoin(lifeSegments, eq(mediaItems.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(desc(mediaItems.isFavourite), asc(mediaItems.status), desc(mediaItems.updatedAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({ id: mediaLogs.mediaItemId, count: sql<number>`count(*)::int` })
    .from(mediaLogs)
    .where(
      and(
        eq(mediaLogs.userId, userId),
        inArray(
          mediaLogs.mediaItemId,
          rows.map((r) => r.item.id)
        )
      )
    )
    .groupBy(mediaLogs.mediaItemId);
  const byId = new Map(counts.map((c) => [c.id, c.count]));
  return rows.map(({ item, segment }) => ({
    ...item,
    segment: segment?.id ? (segment as SegmentRef) : null,
    logCount: byId.get(item.id) ?? 0,
  }));
}

export async function listMediaLists(userId: string): Promise<MediaListRow[]> {
  const lists = await db
    .select()
    .from(mediaLists)
    .where(eq(mediaLists.userId, userId))
    .orderBy(asc(mediaLists.name));
  if (lists.length === 0) return [];
  const members = await db
    .select({
      listId: mediaListItems.listId,
      sortOrder: mediaListItems.sortOrder,
      item: mediaItems,
    })
    .from(mediaListItems)
    .innerJoin(mediaItems, eq(mediaListItems.mediaItemId, mediaItems.id))
    .where(
      and(
        eq(mediaListItems.userId, userId),
        isNull(mediaItems.deletedAt),
        inArray(
          mediaListItems.listId,
          lists.map((l) => l.id)
        )
      )
    )
    .orderBy(asc(mediaListItems.sortOrder));
  return lists.map((l) => ({
    ...l,
    items: members.filter((m) => m.listId === l.id).map((m) => m.item),
  }));
}
