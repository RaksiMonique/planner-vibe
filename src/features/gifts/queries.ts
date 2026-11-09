import 'server-only';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { giftRecipients, gifts, lifeSegments, userPreferences, wishlistItems } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type GiftRecipient = typeof giftRecipients.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type GiftRow = Gift & { recipient: Pick<GiftRecipient, 'id' | 'name'>; segment: SegmentRef };
export type RecipientRow = GiftRecipient & { giftCount: number; openCount: number };

/** ISO 4217 code from the user's preferences (default USD). */
export async function getCurrency(userId: string): Promise<string> {
  const [row] = await db
    .select({ currency: userPreferences.currency })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return row?.currency ?? 'USD';
}

export async function listRecipients(userId: string): Promise<RecipientRow[]> {
  const rows = await db
    .select()
    .from(giftRecipients)
    .where(and(eq(giftRecipients.userId, userId), isNull(giftRecipients.deletedAt)))
    .orderBy(asc(giftRecipients.name));
  if (rows.length === 0) return [];
  const counts = await db
    .select({
      recipientId: gifts.recipientId,
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${gifts.status} <> 'given')::int`,
    })
    .from(gifts)
    .where(and(eq(gifts.userId, userId), isNull(gifts.deletedAt)))
    .groupBy(gifts.recipientId);
  const byId = new Map(counts.map((c) => [c.recipientId, c]));
  return rows.map((r) => ({
    ...r,
    giftCount: byId.get(r.id)?.total ?? 0,
    openCount: byId.get(r.id)?.open ?? 0,
  }));
}

export async function listGifts(
  userId: string,
  filters: { recipientId?: string } = {}
): Promise<GiftRow[]> {
  const conds = [eq(gifts.userId, userId), isNull(gifts.deletedAt)];
  if (filters.recipientId) conds.push(eq(gifts.recipientId, filters.recipientId));
  const rows = await db
    .select({
      gift: gifts,
      recipient: { id: giftRecipients.id, name: giftRecipients.name },
      segment: segmentRefColumns,
    })
    .from(gifts)
    .innerJoin(giftRecipients, eq(gifts.recipientId, giftRecipients.id))
    .innerJoin(lifeSegments, eq(gifts.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(asc(gifts.occasionDate), desc(gifts.updatedAt));
  return rows.map((r) => ({ ...r.gift, recipient: r.recipient, segment: r.segment }));
}

export async function listWishlist(userId: string): Promise<WishlistItem[]> {
  return db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), isNull(wishlistItems.deletedAt)))
    .orderBy(
      asc(wishlistItems.acquiredAt),
      asc(wishlistItems.priority),
      desc(wishlistItems.updatedAt)
    );
}
