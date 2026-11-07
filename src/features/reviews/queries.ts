import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { goals, lifeSegments, reviews } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ReviewKind } from './templates';

export type Review = typeof reviews.$inferSelect;
export type ReviewRow = Review & { segment: SegmentRef; goalTitle: string | null };

const base = () =>
  db
    .select({ review: reviews, segment: segmentRefColumns, goalTitle: goals.title })
    .from(reviews)
    .innerJoin(lifeSegments, eq(reviews.lifeSegmentId, lifeSegments.id))
    .leftJoin(goals, eq(reviews.goalId, goals.id));

const toRow = (r: {
  review: Review;
  segment: SegmentRef;
  goalTitle: string | null;
}): ReviewRow => ({
  ...r.review,
  segment: r.segment,
  goalTitle: r.goalTitle,
});

export async function listReviews(
  userId: string,
  opts: { kind?: ReviewKind; limit?: number } = {}
): Promise<ReviewRow[]> {
  const conds = [eq(reviews.userId, userId), isNull(reviews.deletedAt)];
  if (opts.kind) conds.push(eq(reviews.kind, opts.kind));
  const rows = await base()
    .where(and(...conds))
    .orderBy(desc(reviews.periodStart), desc(reviews.createdAt))
    .limit(opts.limit ?? 200);
  return rows.map(toRow);
}

export async function getReview(userId: string, id: string): Promise<ReviewRow | null> {
  const [row] = await base()
    .where(and(eq(reviews.userId, userId), eq(reviews.id, id), isNull(reviews.deletedAt)))
    .limit(1);
  return row ? toRow(row) : null;
}

/** The review for a period (and goal, for goal reviews), if it exists. */
export async function findReview(
  userId: string,
  kind: ReviewKind,
  periodStartKey: string,
  goalId?: string
): Promise<ReviewRow | null> {
  const conds = [
    eq(reviews.userId, userId),
    isNull(reviews.deletedAt),
    eq(reviews.kind, kind),
    eq(reviews.periodStart, periodStartKey),
  ];
  if (goalId) conds.push(eq(reviews.goalId, goalId));
  const [row] = await base()
    .where(and(...conds))
    .orderBy(desc(reviews.createdAt))
    .limit(1);
  return row ? toRow(row) : null;
}
