import 'server-only';
import { and, asc, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { moodEntries, products, userPreferences, wellnessEntries } from '@/db/schema';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences, type Preferences } from '@/features/settings/service';
import { ValidationError } from '@/lib/errors';
import type { WellnessKind } from './schema';

export type MoodEntry = typeof moodEntries.$inferSelect;
export type WellnessEntry = typeof wellnessEntries.$inferSelect;
export type Product = typeof products.$inferSelect;

export type WellnessPrefs = Preferences & { currency: string; cycleEnabled: boolean };

/** Preferences plus the currency and the cycle-tracking flag (off by default). */
export async function getWellnessPrefs(userId: string): Promise<WellnessPrefs> {
  const prefs = await getPreferences(userId);
  const [row] = await db
    .select({ currency: userPreferences.currency })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return {
    ...prefs,
    currency: row?.currency ?? 'USD',
    cycleEnabled: prefs.enabledModules['cycle-tracking'] === true,
  };
}

/** Wellness records default to Health & Wellness, else the first segment. */
export async function defaultWellnessSegmentId(userId: string): Promise<string> {
  const segments = await listSegments(userId);
  const health = segments.find((s) => s.slug === 'health');
  const id = health?.id ?? segments[0]?.id;
  if (!id) throw new ValidationError('Create a Life Segment first.');
  return id;
}

export async function getMoodForDate(userId: string, dateKey: string): Promise<MoodEntry | null> {
  const [row] = await db
    .select()
    .from(moodEntries)
    .where(and(eq(moodEntries.userId, userId), eq(moodEntries.date, dateKey)))
    .limit(1);
  return row ?? null;
}

/** Mood entries with dates in [fromKey, toKey], oldest first. */
export async function listMoodBetween(
  userId: string,
  fromKey: string,
  toKey: string
): Promise<MoodEntry[]> {
  return db
    .select()
    .from(moodEntries)
    .where(
      and(
        eq(moodEntries.userId, userId),
        gte(moodEntries.date, fromKey),
        lte(moodEntries.date, toKey)
      )
    )
    .orderBy(asc(moodEntries.date));
}

/** Wellness entries with dates in [fromKey, toKey], optionally limited to some kinds. */
export async function listWellnessBetween(
  userId: string,
  fromKey: string,
  toKey: string,
  kinds?: WellnessKind[]
): Promise<WellnessEntry[]> {
  const conds = [
    eq(wellnessEntries.userId, userId),
    isNull(wellnessEntries.deletedAt),
    gte(wellnessEntries.date, fromKey),
    lte(wellnessEntries.date, toKey),
  ];
  if (kinds && kinds.length > 0) conds.push(inArray(wellnessEntries.kind, kinds));
  return db
    .select()
    .from(wellnessEntries)
    .where(and(...conds))
    .orderBy(asc(wellnessEntries.date), asc(wellnessEntries.createdAt));
}

export async function getWellnessEntry(userId: string, id: string): Promise<WellnessEntry | null> {
  const [row] = await db
    .select()
    .from(wellnessEntries)
    .where(
      and(
        eq(wellnessEntries.userId, userId),
        eq(wellnessEntries.id, id),
        isNull(wellnessEntries.deletedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function listProducts(userId: string): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(and(eq(products.userId, userId), isNull(products.deletedAt)))
    .orderBy(desc(products.isFavourite), asc(products.category), asc(products.name));
}

export async function getProduct(userId: string, id: string): Promise<Product | null> {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.userId, userId), eq(products.id, id), isNull(products.deletedAt)))
    .limit(1);
  return row ?? null;
}
