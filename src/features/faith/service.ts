import 'server-only';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { db } from '@/db';
import {
  bibleStudies,
  bibleStudyNotes,
  devotionalEntries,
  lifeSegments,
  prayerEntries,
  readingPlans,
  readingProgress,
  scriptureReferences,
} from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { PLAN_PRESETS, type PlanPreset } from './plans';
import type {
  BibleStudy,
  DevotionalEntry,
  PrayerEntry,
  ReadingPlan,
  ScriptureReference,
} from './queries';
import { formatReference, parseReference } from './references';
import type { DevotionalInput, PlanInput, PrayerInput, StudyInput, StudyStatus } from './schema';

async function assertSegmentOwned(userId: string, lifeSegmentId: string) {
  const count = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (count === 0) throw new ValidationError('That Life Segment does not exist.');
}

// ── Studies ────────────────────────────────────────────────────────────────

export async function getStudyOrThrow(userId: string, id: string): Promise<BibleStudy> {
  const [row] = await db
    .select()
    .from(bibleStudies)
    .where(
      and(eq(bibleStudies.userId, userId), eq(bibleStudies.id, id), isNull(bibleStudies.deletedAt))
    )
    .limit(1);
  if (!row) throw new NotFoundError('That study does not exist.');
  return row;
}

async function studyValues(userId: string, input: StudyInput, selfId?: string) {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  if (input.prerequisiteId) {
    if (input.prerequisiteId === selfId)
      throw new ValidationError('A study cannot require itself.');
    await getStudyOrThrow(userId, input.prerequisiteId);
  }
  return {
    title: input.title,
    lifeSegmentId: input.lifeSegmentId,
    kind: input.kind,
    status: input.status,
    priority: input.priority,
    translation: input.translation || null,
    prerequisiteId: input.prerequisiteId ?? null,
    description: input.description ?? null,
  };
}

export async function createStudy(userId: string, input: StudyInput): Promise<BibleStudy> {
  const values = await studyValues(userId, input);
  const [row] = await db
    .insert(bibleStudies)
    .values({ ...values, userId })
    .returning();
  return row;
}

export async function updateStudy(
  userId: string,
  id: string,
  input: StudyInput
): Promise<BibleStudy> {
  await getStudyOrThrow(userId, id);
  const values = await studyValues(userId, input, id);
  const [row] = await db
    .update(bibleStudies)
    .set(values)
    .where(and(eq(bibleStudies.userId, userId), eq(bibleStudies.id, id)))
    .returning();
  return row;
}

export async function setStudyStatus(userId: string, id: string, status: StudyStatus) {
  await getStudyOrThrow(userId, id);
  await db
    .update(bibleStudies)
    .set({ status, lastStudiedAt: status === 'in_progress' ? new Date() : undefined })
    .where(and(eq(bibleStudies.userId, userId), eq(bibleStudies.id, id)));
}

/** "I studied this today": bumps last_studied_at and moves a not-started study along. */
export async function touchStudy(userId: string, id: string) {
  const study = await getStudyOrThrow(userId, id);
  await db
    .update(bibleStudies)
    .set({
      lastStudiedAt: new Date(),
      status: study.status === 'not_started' ? 'in_progress' : study.status,
    })
    .where(and(eq(bibleStudies.userId, userId), eq(bibleStudies.id, id)));
}

export async function removeStudy(userId: string, id: string) {
  await getStudyOrThrow(userId, id);
  await db
    .update(bibleStudies)
    .set({ deletedAt: new Date() })
    .where(and(eq(bibleStudies.userId, userId), eq(bibleStudies.id, id)));
  // Nothing should still require a deleted study.
  await db
    .update(bibleStudies)
    .set({ prerequisiteId: null })
    .where(and(eq(bibleStudies.userId, userId), eq(bibleStudies.prerequisiteId, id)));
}

// ── References ─────────────────────────────────────────────────────────────

/** Parses typed text into a stored reference row. Throws a validation error when it cannot be read. */
export async function createReference(
  userId: string,
  text: string,
  opts: { note?: string; isBookmark?: boolean; isFavourite?: boolean } = {}
): Promise<ScriptureReference> {
  const parsed = parseReference(text);
  if (!parsed)
    throw new ValidationError(`"${text}" is not a passage I recognise. Try "John 3:16".`);
  const [row] = await db
    .insert(scriptureReferences)
    .values({
      userId,
      bookId: parsed.bookId,
      chapter: parsed.chapter,
      verseStart: parsed.verseStart,
      verseEnd: parsed.verseEnd,
      chapterEnd: parsed.chapterEnd,
      label: formatReference(parsed),
      note: opts.note ?? null,
      isBookmark: opts.isBookmark ?? false,
      isFavourite: opts.isFavourite ?? false,
    })
    .returning();
  return row;
}

export async function setReferenceFlag(
  userId: string,
  id: string,
  flag: 'isBookmark' | 'isFavourite',
  value: boolean
) {
  const result = await db
    .update(scriptureReferences)
    .set({ [flag]: value })
    .where(and(eq(scriptureReferences.userId, userId), eq(scriptureReferences.id, id)))
    .returning({ id: scriptureReferences.id });
  if (result.length === 0) throw new NotFoundError('That passage does not exist.');
}

export async function removeReference(userId: string, id: string) {
  await db
    .delete(scriptureReferences)
    .where(and(eq(scriptureReferences.userId, userId), eq(scriptureReferences.id, id)));
}

// ── Study notes ────────────────────────────────────────────────────────────

export async function addStudyNote(
  userId: string,
  studyId: string,
  content: string,
  referenceText?: string
) {
  await getStudyOrThrow(userId, studyId);
  const reference = referenceText ? await createReference(userId, referenceText) : null;
  await db
    .insert(bibleStudyNotes)
    .values({ userId, studyId, content, referenceId: reference?.id ?? null });
  await touchStudy(userId, studyId);
}

export async function removeStudyNote(userId: string, id: string) {
  await db
    .delete(bibleStudyNotes)
    .where(and(eq(bibleStudyNotes.userId, userId), eq(bibleStudyNotes.id, id)));
}

// ── Reading plans ──────────────────────────────────────────────────────────

export async function getPlanOrThrow(userId: string, id: string): Promise<ReadingPlan> {
  const [row] = await db
    .select()
    .from(readingPlans)
    .where(
      and(eq(readingPlans.userId, userId), eq(readingPlans.id, id), isNull(readingPlans.deletedAt))
    )
    .limit(1);
  if (!row) throw new NotFoundError('That reading plan does not exist.');
  return row;
}

export async function createPlan(userId: string, input: PlanInput): Promise<ReadingPlan> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const preset = input.preset as PlanPreset;
  const bookIds =
    preset === 'custom'
      ? [...new Set(input.bookIds)].sort((a, b) => a - b)
      : PLAN_PRESETS[preset].bookIds;
  if (preset === 'custom' && bookIds && bookIds.length === 0) {
    throw new ValidationError('Choose at least one book.');
  }
  // Queued behind an unfinished plan: wait, and leave the active plan alone.
  let startsAfter: ReadingPlan | null = null;
  if (input.startsAfterPlanId) {
    const before = await getPlanOrThrow(userId, input.startsAfterPlanId);
    if (before.status !== 'done') {
      const taken = await db.$count(
        readingPlans,
        and(
          eq(readingPlans.userId, userId),
          eq(readingPlans.startsAfterPlanId, before.id),
          isNull(readingPlans.deletedAt)
        )
      );
      if (taken > 0) throw new ValidationError('Another plan is already queued behind that one.');
      startsAfter = before;
    }
  }
  if (!startsAfter) await pauseActivePlans(userId);
  const [row] = await db
    .insert(readingPlans)
    .values({
      userId,
      lifeSegmentId: input.lifeSegmentId,
      name: input.name,
      bookIds: bookIds ? [...bookIds] : null,
      chaptersPerDay: input.chaptersPerDay,
      startDate: input.startDate,
      status: startsAfter ? 'paused' : 'active',
      startsAfterPlanId: startsAfter?.id ?? null,
    })
    .returning();
  return row;
}

/** One active plan at a time keeps "today's reading" unambiguous. */
async function pauseActivePlans(userId: string) {
  await db
    .update(readingPlans)
    .set({ status: 'paused' })
    .where(and(eq(readingPlans.userId, userId), eq(readingPlans.status, 'active')));
}

/** The unfinished plan this one is queued behind, if any. */
async function planInFront(userId: string, plan: ReadingPlan): Promise<ReadingPlan | null> {
  if (!plan.startsAfterPlanId) return null;
  const [before] = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.userId, userId),
        eq(readingPlans.id, plan.startsAfterPlanId),
        isNull(readingPlans.deletedAt)
      )
    )
    .limit(1);
  return before && before.status !== 'done' ? before : null;
}

/**
 * Changes a plan's status. Finishing a plan starts the one queued behind it
 * from today, so its schedule is not already behind. `todayKey` is yyyy-MM-dd
 * in the user's zone.
 */
export async function setPlanStatus(
  userId: string,
  id: string,
  status: ReadingPlan['status'],
  todayKey: string
) {
  const plan = await getPlanOrThrow(userId, id);
  if (status === 'active') {
    const before = await planInFront(userId, plan);
    if (before) {
      throw new ValidationError(
        `“${plan.name}” is queued behind “${before.name}”. Finish that first.`
      );
    }
    await pauseActivePlans(userId);
  }
  await db
    .update(readingPlans)
    .set({ status })
    .where(and(eq(readingPlans.userId, userId), eq(readingPlans.id, id)));
  if (status === 'done') await startNextInQueue(userId, id, todayKey);
}

async function startNextInQueue(userId: string, finishedId: string, todayKey: string) {
  const [next] = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.userId, userId),
        eq(readingPlans.startsAfterPlanId, finishedId),
        isNull(readingPlans.deletedAt),
        ne(readingPlans.status, 'done')
      )
    )
    .limit(1);
  if (!next) return;
  await pauseActivePlans(userId);
  await db
    .update(readingPlans)
    .set({ status: 'active', startDate: todayKey })
    .where(and(eq(readingPlans.userId, userId), eq(readingPlans.id, next.id)));
}

/** Soft delete. Anything queued behind the plan is released to be resumed by hand. */
export async function removePlan(userId: string, id: string) {
  await getPlanOrThrow(userId, id);
  await db
    .update(readingPlans)
    .set({ startsAfterPlanId: null })
    .where(and(eq(readingPlans.userId, userId), eq(readingPlans.startsAfterPlanId, id)));
  await db
    .update(readingPlans)
    .set({ deletedAt: new Date(), status: 'paused', startsAfterPlanId: null })
    .where(and(eq(readingPlans.userId, userId), eq(readingPlans.id, id)));
}

export async function markChapterRead(
  userId: string,
  planId: string,
  bookId: number,
  chapter: number,
  dateKey: string
) {
  await getPlanOrThrow(userId, planId);
  await db
    .insert(readingProgress)
    .values({ userId, planId, bookId, chapter, readOn: dateKey })
    .onConflictDoNothing();
}

export async function unmarkChapter(
  userId: string,
  planId: string,
  bookId: number,
  chapter: number
) {
  await db
    .delete(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.planId, planId),
        eq(readingProgress.bookId, bookId),
        eq(readingProgress.chapter, chapter)
      )
    );
}

// ── Prayer ─────────────────────────────────────────────────────────────────

export async function getPrayerOrThrow(userId: string, id: string): Promise<PrayerEntry> {
  const [row] = await db
    .select()
    .from(prayerEntries)
    .where(
      and(
        eq(prayerEntries.userId, userId),
        eq(prayerEntries.id, id),
        isNull(prayerEntries.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError('That prayer entry does not exist.');
  return row;
}

export async function createPrayer(userId: string, input: PrayerInput): Promise<PrayerEntry> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(prayerEntries)
    .values({ ...input, content: input.content ?? null, userId })
    .returning();
  return row;
}

export async function updatePrayer(
  userId: string,
  id: string,
  input: PrayerInput
): Promise<PrayerEntry> {
  await getPrayerOrThrow(userId, id);
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const [row] = await db
    .update(prayerEntries)
    .set({ ...input, content: input.content ?? null })
    .where(and(eq(prayerEntries.userId, userId), eq(prayerEntries.id, id)))
    .returning();
  return row;
}

export async function setPrayerAnswered(userId: string, id: string, answered: boolean) {
  await getPrayerOrThrow(userId, id);
  await db
    .update(prayerEntries)
    .set({ answeredAt: answered ? new Date() : null })
    .where(and(eq(prayerEntries.userId, userId), eq(prayerEntries.id, id)));
}

export async function removePrayer(userId: string, id: string) {
  await getPrayerOrThrow(userId, id);
  await db
    .update(prayerEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(prayerEntries.userId, userId), eq(prayerEntries.id, id)));
}

// ── Devotionals ────────────────────────────────────────────────────────────

/** One devotional per day: creates or updates the entry for that date. */
export async function saveDevotional(
  userId: string,
  input: DevotionalInput
): Promise<DevotionalEntry> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const reference = input.reference ? await createReference(userId, input.reference) : null;
  const values = {
    lifeSegmentId: input.lifeSegmentId,
    title: input.title,
    source: input.source || null,
    reflection: input.reflection ?? null,
  };
  const [existing] = await db
    .select()
    .from(devotionalEntries)
    .where(
      and(
        eq(devotionalEntries.userId, userId),
        eq(devotionalEntries.date, input.date),
        isNull(devotionalEntries.deletedAt)
      )
    )
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(devotionalEntries)
      .set({ ...values, referenceId: reference?.id ?? existing.referenceId })
      .where(eq(devotionalEntries.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(devotionalEntries)
    .values({ ...values, userId, date: input.date, referenceId: reference?.id ?? null })
    .returning();
  return row;
}

export async function removeDevotional(userId: string, id: string) {
  await db
    .update(devotionalEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(devotionalEntries.userId, userId), eq(devotionalEntries.id, id)));
}
