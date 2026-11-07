import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, mediaItems, mediaListItems, mediaLists, mediaLogs } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { MediaItem, MediaList } from './queries';
import type { MediaItemInput, MediaListInput, MediaLogInput } from './schema';

async function assertSegment(userId: string, lifeSegmentId: string) {
  const n = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (n === 0) throw new ValidationError('That Life Segment does not exist.');
}

export async function getMediaItemOrThrow(userId: string, id: string): Promise<MediaItem> {
  const [row] = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.userId, userId), eq(mediaItems.id, id), isNull(mediaItems.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That item does not exist.');
  return row;
}

async function getListOrThrow(userId: string, id: string): Promise<MediaList> {
  const [row] = await db
    .select()
    .from(mediaLists)
    .where(and(eq(mediaLists.userId, userId), eq(mediaLists.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That list does not exist.');
  return row;
}

function itemValues(input: MediaItemInput) {
  return {
    kind: input.kind,
    title: input.title,
    creator: input.creator || null,
    coverUrl: input.coverUrl || null,
    category: input.category || null,
    status: input.status,
    rating: input.rating ?? null,
    review: input.review || null,
    notes: input.notes || null,
    isFavourite: input.isFavourite,
    startedOn: input.startedOn ?? null,
    finishedOn: input.finishedOn ?? null,
    lifeSegmentId: input.lifeSegmentId ?? null,
  };
}

export async function createMediaItem(userId: string, input: MediaItemInput): Promise<MediaItem> {
  if (input.lifeSegmentId) await assertSegment(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(mediaItems)
    .values({ ...itemValues(input), userId })
    .returning();
  return row;
}

export async function updateMediaItem(userId: string, id: string, input: MediaItemInput) {
  await getMediaItemOrThrow(userId, id);
  if (input.lifeSegmentId) await assertSegment(userId, input.lifeSegmentId);
  await db
    .update(mediaItems)
    .set(itemValues(input))
    .where(and(eq(mediaItems.userId, userId), eq(mediaItems.id, id)));
}

/** Moving to "in progress" stamps a start date; "done" stamps a finish date, when missing. */
export async function setMediaStatus(
  userId: string,
  id: string,
  status: MediaItem['status'],
  todayKey: string
) {
  const row = await getMediaItemOrThrow(userId, id);
  await db
    .update(mediaItems)
    .set({
      status,
      startedOn: status === 'in_progress' && !row.startedOn ? todayKey : row.startedOn,
      finishedOn: status === 'done' && !row.finishedOn ? todayKey : row.finishedOn,
    })
    .where(and(eq(mediaItems.userId, userId), eq(mediaItems.id, id)));
}

export async function toggleFavourite(userId: string, id: string) {
  const row = await getMediaItemOrThrow(userId, id);
  await db
    .update(mediaItems)
    .set({ isFavourite: !row.isFavourite })
    .where(and(eq(mediaItems.userId, userId), eq(mediaItems.id, id)));
}

export async function removeMediaItem(userId: string, id: string) {
  await getMediaItemOrThrow(userId, id);
  await db
    .update(mediaItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(mediaItems.userId, userId), eq(mediaItems.id, id)));
}

/** Logging progress on a wish-listed item moves it to in progress. */
export async function addMediaLog(userId: string, input: MediaLogInput) {
  const item = await getMediaItemOrThrow(userId, input.mediaItemId);
  await assertSegment(userId, input.lifeSegmentId);
  await db.insert(mediaLogs).values({
    userId,
    mediaItemId: input.mediaItemId,
    lifeSegmentId: input.lifeSegmentId,
    date: input.date,
    progress: input.progress || null,
    minutes: input.minutes ?? null,
    note: input.note || null,
  });
  if (item.status === 'wishlist') {
    await db
      .update(mediaItems)
      .set({ status: 'in_progress', startedOn: item.startedOn ?? input.date })
      .where(and(eq(mediaItems.userId, userId), eq(mediaItems.id, item.id)));
  }
}

export async function removeMediaLog(userId: string, id: string) {
  await db.delete(mediaLogs).where(and(eq(mediaLogs.userId, userId), eq(mediaLogs.id, id)));
}

export async function createMediaList(userId: string, input: MediaListInput): Promise<MediaList> {
  const [row] = await db
    .insert(mediaLists)
    .values({ userId, name: input.name, kind: input.kind ?? null })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new ValidationError('You already have a list with that name.');
  return row;
}

export async function removeMediaList(userId: string, id: string) {
  await getListOrThrow(userId, id);
  await db.delete(mediaLists).where(and(eq(mediaLists.userId, userId), eq(mediaLists.id, id)));
}

export async function addToList(userId: string, listId: string, mediaItemId: string) {
  await getListOrThrow(userId, listId);
  await getMediaItemOrThrow(userId, mediaItemId);
  const existing = await db.$count(mediaListItems, eq(mediaListItems.listId, listId));
  await db
    .insert(mediaListItems)
    .values({ userId, listId, mediaItemId, sortOrder: existing })
    .onConflictDoNothing();
}

export async function removeFromList(userId: string, listId: string, mediaItemId: string) {
  await db
    .delete(mediaListItems)
    .where(
      and(
        eq(mediaListItems.userId, userId),
        eq(mediaListItems.listId, listId),
        eq(mediaListItems.mediaItemId, mediaItemId)
      )
    );
}
