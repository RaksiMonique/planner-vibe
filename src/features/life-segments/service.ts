import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { slugify, type SegmentInput } from './schema';

export type LifeSegment = typeof lifeSegments.$inferSelect;

/** Seeded for every new user (instructions.md 1.3). */
export const DEFAULT_SEGMENTS: Array<Pick<LifeSegment, 'name' | 'slug' | 'accent' | 'icon'>> = [
  { name: 'Faith', slug: 'faith', accent: 'burgundy', icon: 'church' },
  { name: 'Finance', slug: 'finance', accent: 'terracotta', icon: 'wallet' },
  { name: 'Family', slug: 'family', accent: 'coral', icon: 'users' },
  { name: 'Health & Wellness', slug: 'health', accent: 'sage', icon: 'heart-pulse' },
  { name: 'Career & Work', slug: 'career', accent: 'burgundy', icon: 'briefcase' },
  { name: 'Education & Learning', slug: 'learning', accent: 'terracotta', icon: 'graduation-cap' },
  { name: 'Personal Development', slug: 'growth', accent: 'peach', icon: 'sprout' },
  { name: 'Lifestyle & Home', slug: 'home', accent: 'beige', icon: 'house' },
  { name: 'Relationships', slug: 'relationships', accent: 'coral', icon: 'hand-heart' },
  { name: 'Recreation', slug: 'recreation', accent: 'sage', icon: 'tent-tree' },
];

/** Creates the ten defaults the first time a user has no segments at all. */
export async function ensureDefaultSegments(userId: string): Promise<void> {
  const existing = await db.$count(lifeSegments, eq(lifeSegments.userId, userId));
  if (existing > 0) return;
  await db
    .insert(lifeSegments)
    .values(DEFAULT_SEGMENTS.map((s, i) => ({ ...s, userId, sortOrder: i, isDefault: true })))
    .onConflictDoNothing();
}

export async function listSegments(
  userId: string,
  opts: { includeArchived?: boolean } = {}
): Promise<LifeSegment[]> {
  await ensureDefaultSegments(userId);
  return db
    .select()
    .from(lifeSegments)
    .where(
      opts.includeArchived
        ? eq(lifeSegments.userId, userId)
        : and(eq(lifeSegments.userId, userId), isNull(lifeSegments.archivedAt))
    )
    .orderBy(asc(lifeSegments.sortOrder), asc(lifeSegments.name));
}

export async function getSegmentBySlug(userId: string, slug: string): Promise<LifeSegment> {
  const [row] = await db
    .select()
    .from(lifeSegments)
    .where(and(eq(lifeSegments.userId, userId), eq(lifeSegments.slug, slug)))
    .limit(1);
  if (!row) throw new NotFoundError('That Life Segment does not exist.');
  return row;
}

export async function getSegmentById(userId: string, id: string): Promise<LifeSegment> {
  const [row] = await db
    .select()
    .from(lifeSegments)
    .where(and(eq(lifeSegments.userId, userId), eq(lifeSegments.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That Life Segment does not exist.');
  return row;
}

async function uniqueSlug(userId: string, base: string, ignoreId?: string): Promise<string> {
  const slug = base || 'segment';
  const rows = await db
    .select({ id: lifeSegments.id, slug: lifeSegments.slug })
    .from(lifeSegments)
    .where(eq(lifeSegments.userId, userId));
  const taken = new Set(rows.filter((r) => r.id !== ignoreId).map((r) => r.slug));
  if (!taken.has(slug)) return slug;
  for (let i = 2; i < 100; i++) if (!taken.has(`${slug}-${i}`)) return `${slug}-${i}`;
  throw new ValidationError('Too many segments share that name.');
}

export async function createSegment(userId: string, input: SegmentInput): Promise<LifeSegment> {
  const [{ max }] = await db
    .select({ max: db.$count(lifeSegments, eq(lifeSegments.userId, userId)) })
    .from(lifeSegments)
    .limit(1)
    .catch(() => [{ max: 0 }]);
  const slug = await uniqueSlug(userId, slugify(input.name));
  const [row] = await db
    .insert(lifeSegments)
    .values({ ...input, userId, slug, sortOrder: Number(max ?? 0) })
    .returning();
  return row;
}

export async function updateSegment(
  userId: string,
  id: string,
  input: SegmentInput
): Promise<LifeSegment> {
  await getSegmentById(userId, id);
  const slug = await uniqueSlug(userId, slugify(input.name), id);
  const [row] = await db
    .update(lifeSegments)
    .set({ ...input, slug })
    .where(and(eq(lifeSegments.userId, userId), eq(lifeSegments.id, id)))
    .returning();
  return row;
}

export async function setSegmentArchived(userId: string, id: string, archived: boolean) {
  await getSegmentById(userId, id);
  await db
    .update(lifeSegments)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(lifeSegments.userId, userId), eq(lifeSegments.id, id)));
}

export async function reorderSegments(userId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      db
        .update(lifeSegments)
        .set({ sortOrder: i })
        .where(and(eq(lifeSegments.userId, userId), eq(lifeSegments.id, id)))
    )
  );
}
