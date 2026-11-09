import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { giftRecipients, gifts, lifeSegments, wishlistItems } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { Gift, GiftRecipient, WishlistItem } from './queries';
import type { GiftInput, GiftStatus, RecipientInput, WishlistInput } from './schema';

async function assertSegment(userId: string, lifeSegmentId: string) {
  const n = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (n === 0) throw new ValidationError('That Life Segment does not exist.');
}

export async function getRecipientOrThrow(userId: string, id: string): Promise<GiftRecipient> {
  const [row] = await db
    .select()
    .from(giftRecipients)
    .where(
      and(
        eq(giftRecipients.userId, userId),
        eq(giftRecipients.id, id),
        isNull(giftRecipients.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError('That person is not in your list.');
  return row;
}

export async function getGiftOrThrow(userId: string, id: string): Promise<Gift> {
  const [row] = await db
    .select()
    .from(gifts)
    .where(and(eq(gifts.userId, userId), eq(gifts.id, id), isNull(gifts.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That gift does not exist.');
  return row;
}

function recipientValues(input: RecipientInput) {
  return {
    name: input.name,
    relationship: input.relationship || null,
    birthday: input.birthday ?? null,
    notes: input.notes || null,
  };
}

export async function createRecipient(
  userId: string,
  input: RecipientInput
): Promise<GiftRecipient> {
  const [row] = await db
    .insert(giftRecipients)
    .values({ userId, ...recipientValues(input) })
    .returning();
  return row;
}

export async function updateRecipient(userId: string, id: string, input: RecipientInput) {
  await getRecipientOrThrow(userId, id);
  await db
    .update(giftRecipients)
    .set(recipientValues(input))
    .where(and(eq(giftRecipients.userId, userId), eq(giftRecipients.id, id)));
}

/** Soft-deletes the person and every gift for them. */
export async function removeRecipient(userId: string, id: string) {
  await getRecipientOrThrow(userId, id);
  const now = new Date();
  await db
    .update(gifts)
    .set({ deletedAt: now })
    .where(and(eq(gifts.userId, userId), eq(gifts.recipientId, id), isNull(gifts.deletedAt)));
  await db
    .update(giftRecipients)
    .set({ deletedAt: now })
    .where(and(eq(giftRecipients.userId, userId), eq(giftRecipients.id, id)));
}

function giftValues(input: GiftInput) {
  return {
    recipientId: input.recipientId,
    lifeSegmentId: input.lifeSegmentId,
    title: input.title,
    occasion: input.occasion || null,
    occasionDate: input.occasionDate ?? null,
    status: input.status,
    budget: input.budget === undefined ? null : String(input.budget),
    price: input.price === undefined ? null : String(input.price),
    url: input.url || null,
    notes: input.notes || null,
  };
}

export async function createGift(userId: string, input: GiftInput): Promise<Gift> {
  await getRecipientOrThrow(userId, input.recipientId);
  await assertSegment(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(gifts)
    .values({ userId, ...giftValues(input) })
    .returning();
  return row;
}

export async function updateGift(userId: string, id: string, input: GiftInput) {
  await getGiftOrThrow(userId, id);
  await getRecipientOrThrow(userId, input.recipientId);
  await assertSegment(userId, input.lifeSegmentId);
  await db
    .update(gifts)
    .set(giftValues(input))
    .where(and(eq(gifts.userId, userId), eq(gifts.id, id)));
}

export async function setGiftStatus(userId: string, id: string, status: GiftStatus) {
  await getGiftOrThrow(userId, id);
  await db
    .update(gifts)
    .set({ status })
    .where(and(eq(gifts.userId, userId), eq(gifts.id, id)));
}

export async function removeGift(userId: string, id: string) {
  await getGiftOrThrow(userId, id);
  await db
    .update(gifts)
    .set({ deletedAt: new Date() })
    .where(and(eq(gifts.userId, userId), eq(gifts.id, id)));
}

function wishlistValues(input: WishlistInput) {
  return {
    title: input.title,
    url: input.url || null,
    price: input.price === undefined ? null : String(input.price),
    priority: input.priority,
    notes: input.notes || null,
  };
}

async function getWishOrThrow(userId: string, id: string): Promise<WishlistItem> {
  const [row] = await db
    .select()
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.id, id),
        isNull(wishlistItems.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError('That wish does not exist.');
  return row;
}

export async function createWish(userId: string, input: WishlistInput): Promise<WishlistItem> {
  const [row] = await db
    .insert(wishlistItems)
    .values({ userId, ...wishlistValues(input) })
    .returning();
  return row;
}

export async function updateWish(userId: string, id: string, input: WishlistInput) {
  await getWishOrThrow(userId, id);
  await db
    .update(wishlistItems)
    .set(wishlistValues(input))
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.id, id)));
}

export async function setWishAcquired(userId: string, id: string, acquired: boolean) {
  await getWishOrThrow(userId, id);
  await db
    .update(wishlistItems)
    .set({ acquiredAt: acquired ? new Date() : null })
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.id, id)));
}

export async function removeWish(userId: string, id: string) {
  await getWishOrThrow(userId, id);
  await db
    .update(wishlistItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.id, id)));
}
