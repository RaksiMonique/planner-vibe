import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { journalEntries, lifeSegments, moodEntries, products, wellnessEntries } from '@/db/schema';
import { saveEntry as saveJournalEntry } from '@/features/journal/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { removeImage, uploadImage } from '@/lib/storage';
import { defaultWellnessSegmentId, getProduct, getWellnessEntry } from './queries';
import type { MoodEntry, Product, WellnessEntry } from './queries';
import {
  SCOPE_TITLES,
  WELLNESS_UNITS,
  type MoodInput,
  type ProductInput,
  type TreatmentPlanInput,
  type WellnessEntryInput,
  type WellnessJournalScope,
} from './schema';

async function resolveSegment(userId: string, lifeSegmentId?: string): Promise<string> {
  if (!lifeSegmentId) return defaultWellnessSegmentId(userId);
  const count = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.userId, userId), eq(lifeSegments.id, lifeSegmentId))
  );
  if (count === 0) throw new ValidationError('That Life Segment does not exist.');
  return lifeSegmentId;
}

const money = (n: number | undefined) => (n === undefined ? null : n.toFixed(2));

/** One check-in per day: inserting again updates the day's values. */
export async function saveMood(userId: string, input: MoodInput): Promise<MoodEntry> {
  const lifeSegmentId = await resolveSegment(userId, input.lifeSegmentId);
  const values = {
    userId,
    lifeSegmentId,
    date: input.date,
    mood: input.mood,
    energy: input.energy,
    note: input.note || null,
  };
  const [row] = await db
    .insert(moodEntries)
    .values(values)
    .onConflictDoUpdate({
      target: [moodEntries.userId, moodEntries.date],
      set: { mood: values.mood, energy: values.energy, note: values.note },
    })
    .returning();
  return row;
}

export async function removeMood(userId: string, dateKey: string): Promise<void> {
  await db
    .delete(moodEntries)
    .where(and(eq(moodEntries.userId, userId), eq(moodEntries.date, dateKey)));
}

export async function addWellnessEntry(
  userId: string,
  input: WellnessEntryInput
): Promise<WellnessEntry> {
  const lifeSegmentId = await resolveSegment(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(wellnessEntries)
    .values({
      userId,
      lifeSegmentId,
      kind: input.kind,
      date: input.date,
      value: input.value === undefined ? null : input.value.toFixed(2),
      unit: input.unit || WELLNESS_UNITS[input.kind] || null,
      label: input.label || null,
      note: input.note || null,
    })
    .returning();
  return row;
}

export async function updateWellnessEntry(
  userId: string,
  id: string,
  input: WellnessEntryInput
): Promise<WellnessEntry> {
  const existing = await getWellnessEntry(userId, id);
  if (!existing) throw new NotFoundError('That entry does not exist.');
  const lifeSegmentId = await resolveSegment(userId, input.lifeSegmentId ?? existing.lifeSegmentId);
  const [row] = await db
    .update(wellnessEntries)
    .set({
      lifeSegmentId,
      kind: input.kind,
      date: input.date,
      value: input.value === undefined ? null : input.value.toFixed(2),
      unit: input.unit || WELLNESS_UNITS[input.kind] || null,
      label: input.label || null,
      note: input.note || null,
    })
    .where(and(eq(wellnessEntries.userId, userId), eq(wellnessEntries.id, id)))
    .returning();
  return row;
}

export async function removeWellnessEntry(userId: string, id: string): Promise<void> {
  const existing = await getWellnessEntry(userId, id);
  if (!existing) throw new NotFoundError('That entry does not exist.');
  await db
    .update(wellnessEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(wellnessEntries.userId, userId), eq(wellnessEntries.id, id)));
}

/**
 * Treatments are planned as one entry per chosen day. `value` 1 means done,
 * null means still planned.
 */
export async function planTreatments(
  userId: string,
  input: TreatmentPlanInput
): Promise<WellnessEntry[]> {
  const lifeSegmentId = await resolveSegment(userId, input.lifeSegmentId);
  const unique = [...new Set(input.dates)];
  return db
    .insert(wellnessEntries)
    .values(
      unique.map((date) => ({
        userId,
        lifeSegmentId,
        kind: 'treatment' as const,
        date,
        label: input.label,
      }))
    )
    .returning();
}

export async function setTreatmentDone(userId: string, id: string, done: boolean): Promise<void> {
  const existing = await getWellnessEntry(userId, id);
  if (!existing || existing.kind !== 'treatment')
    throw new NotFoundError('That treatment does not exist.');
  await db
    .update(wellnessEntries)
    .set({ value: done ? '1.00' : null })
    .where(and(eq(wellnessEntries.userId, userId), eq(wellnessEntries.id, id)));
}

export async function createProduct(
  userId: string,
  input: ProductInput,
  image?: File | null
): Promise<Product> {
  const imagePath = image && image.size > 0 ? await uploadImage(userId, 'products', image) : null;
  const [row] = await db
    .insert(products)
    .values({ userId, ...toProductValues(input), imagePath })
    .returning();
  return row;
}

export async function updateProduct(
  userId: string,
  id: string,
  input: ProductInput,
  image?: File | null
): Promise<Product> {
  const existing = await getProduct(userId, id);
  if (!existing) throw new NotFoundError('That product does not exist.');
  let imagePath = existing.imagePath;
  if (image && image.size > 0) {
    imagePath = await uploadImage(userId, 'products', image);
    await removeImage(userId, existing.imagePath);
  }
  const [row] = await db
    .update(products)
    .set({ ...toProductValues(input), imagePath })
    .where(and(eq(products.userId, userId), eq(products.id, id)))
    .returning();
  return row;
}

function toProductValues(input: ProductInput) {
  return {
    name: input.name,
    brand: input.brand || null,
    category: input.category || null,
    inInventory: input.inInventory,
    isFavourite: input.isFavourite,
    onWishlist: input.onWishlist,
    price: money(input.price),
    url: input.url || null,
    openedOn: input.openedOn || null,
    expiresOn: input.expiresOn || null,
    notes: input.notes || null,
  };
}

export async function setProductFlag(
  userId: string,
  id: string,
  flag: 'inInventory' | 'isFavourite' | 'onWishlist',
  value: boolean
): Promise<void> {
  const existing = await getProduct(userId, id);
  if (!existing) throw new NotFoundError('That product does not exist.');
  await db
    .update(products)
    .set({ [flag]: value })
    .where(and(eq(products.userId, userId), eq(products.id, id)));
}

export async function removeProduct(userId: string, id: string): Promise<void> {
  const existing = await getProduct(userId, id);
  if (!existing) throw new NotFoundError('That product does not exist.');
  await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(and(eq(products.userId, userId), eq(products.id, id)));
  await removeImage(userId, existing.imagePath);
}

/**
 * Wellness journal entries are journal entries of kind `wellness`; the scope
 * lives in the title and the date is the day, week start or month start.
 */
export async function saveWellnessJournal(
  userId: string,
  input: {
    id?: string;
    lifeSegmentId?: string;
    scope: WellnessJournalScope;
    date: string;
    content: string;
  }
) {
  const lifeSegmentId = await resolveSegment(userId, input.lifeSegmentId);
  const title = SCOPE_TITLES[input.scope];
  let id = input.id;
  if (!id) {
    const [existing] = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          eq(journalEntries.kind, 'wellness'),
          eq(journalEntries.date, input.date),
          eq(journalEntries.title, title),
          isNull(journalEntries.deletedAt)
        )
      )
      .limit(1);
    id = existing?.id;
  }
  return saveJournalEntry(
    userId,
    { lifeSegmentId, kind: 'wellness', date: input.date, title, content: input.content },
    id
  );
}

/** Count of distinct check-in days, for the streak on the mood page. */
export async function countMoodDays(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId));
  return row?.n ?? 0;
}
