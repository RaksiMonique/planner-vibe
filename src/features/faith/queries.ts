import 'server-only';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
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
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import {
  chapterKey,
  nextReading,
  planChapters,
  planProgress,
  scheduledForDay,
  type PlanChapter,
  type PlanProgress,
} from './plans';

export type BibleStudy = typeof bibleStudies.$inferSelect;
export type BibleStudyNote = typeof bibleStudyNotes.$inferSelect;
export type ScriptureReference = typeof scriptureReferences.$inferSelect;
export type ReadingPlan = typeof readingPlans.$inferSelect;
export type PrayerEntry = typeof prayerEntries.$inferSelect;
export type DevotionalEntry = typeof devotionalEntries.$inferSelect;

export type StudyRow = BibleStudy & { segment: SegmentRef };
export type StudyDetail = StudyRow & {
  notes: Array<BibleStudyNote & { reference: ScriptureReference | null }>;
  prerequisite: Pick<BibleStudy, 'id' | 'title' | 'status'> | null;
  dependants: Array<Pick<BibleStudy, 'id' | 'title' | 'status'>>;
};

export async function listStudies(
  userId: string,
  filters: { lifeSegmentId?: string; status?: BibleStudy['status'] } = {}
): Promise<StudyRow[]> {
  const conds = [eq(bibleStudies.userId, userId), isNull(bibleStudies.deletedAt)];
  if (filters.lifeSegmentId) conds.push(eq(bibleStudies.lifeSegmentId, filters.lifeSegmentId));
  if (filters.status) conds.push(eq(bibleStudies.status, filters.status));
  const rows = await db
    .select({ study: bibleStudies, segment: segmentRefColumns })
    .from(bibleStudies)
    .innerJoin(lifeSegments, eq(bibleStudies.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(desc(bibleStudies.priority), asc(bibleStudies.createdAt));
  return rows.map((r) => ({ ...r.study, segment: r.segment }));
}

export async function getStudy(userId: string, id: string): Promise<StudyDetail | null> {
  const [row] = await db
    .select({ study: bibleStudies, segment: segmentRefColumns })
    .from(bibleStudies)
    .innerJoin(lifeSegments, eq(bibleStudies.lifeSegmentId, lifeSegments.id))
    .where(
      and(eq(bibleStudies.userId, userId), eq(bibleStudies.id, id), isNull(bibleStudies.deletedAt))
    )
    .limit(1);
  if (!row) return null;
  const notes = await db
    .select({ note: bibleStudyNotes, reference: scriptureReferences })
    .from(bibleStudyNotes)
    .leftJoin(scriptureReferences, eq(bibleStudyNotes.referenceId, scriptureReferences.id))
    .where(and(eq(bibleStudyNotes.userId, userId), eq(bibleStudyNotes.studyId, id)))
    .orderBy(desc(bibleStudyNotes.createdAt));
  const related = await db
    .select({
      id: bibleStudies.id,
      title: bibleStudies.title,
      status: bibleStudies.status,
      prerequisiteId: bibleStudies.prerequisiteId,
    })
    .from(bibleStudies)
    .where(
      and(
        eq(bibleStudies.userId, userId),
        isNull(bibleStudies.deletedAt),
        or(
          eq(bibleStudies.prerequisiteId, id),
          row.study.prerequisiteId
            ? eq(bibleStudies.id, row.study.prerequisiteId)
            : eq(bibleStudies.id, id)
        )
      )
    );
  const prerequisite = related.find((r) => r.id === row.study.prerequisiteId) ?? null;
  return {
    ...row.study,
    segment: row.segment,
    notes: notes.map((n) => ({ ...n.note, reference: n.reference })),
    prerequisite: prerequisite
      ? { id: prerequisite.id, title: prerequisite.title, status: prerequisite.status }
      : null,
    dependants: related
      .filter((r) => r.prerequisiteId === id)
      .map((r) => ({ id: r.id, title: r.title, status: r.status })),
  };
}

export async function listReferences(
  userId: string,
  filters: { bookmarks?: boolean; favourites?: boolean } = {}
): Promise<ScriptureReference[]> {
  const conds = [eq(scriptureReferences.userId, userId)];
  if (filters.bookmarks) conds.push(eq(scriptureReferences.isBookmark, true));
  if (filters.favourites) conds.push(eq(scriptureReferences.isFavourite, true));
  return db
    .select()
    .from(scriptureReferences)
    .where(and(...conds))
    .orderBy(desc(scriptureReferences.createdAt));
}

export async function listPlans(
  userId: string,
  filters: { status?: ReadingPlan['status'] } = {}
): Promise<ReadingPlan[]> {
  const conds = [eq(readingPlans.userId, userId), isNull(readingPlans.deletedAt)];
  if (filters.status) conds.push(eq(readingPlans.status, filters.status));
  return db
    .select()
    .from(readingPlans)
    .where(and(...conds))
    .orderBy(asc(readingPlans.createdAt));
}

export type PlanOverview = {
  plan: ReadingPlan;
  progress: PlanProgress;
  /** The next unread chapters, as many as the plan reads per day. */
  today: Array<PlanChapter & { read: boolean }>;
  /** What the calendar schedule says for today, for context. */
  scheduled: PlanChapter[];
  readKeys: string[];
};

/** The active plan with today's reading, or null when there is none. */
export async function getActivePlanOverview(
  userId: string,
  todayKey: string
): Promise<PlanOverview | null> {
  const [plan] = await listPlans(userId, { status: 'active' });
  if (!plan) return null;
  return getPlanOverview(userId, plan, todayKey);
}

export async function getPlanOverview(
  userId: string,
  plan: ReadingPlan,
  todayKey: string
): Promise<PlanOverview> {
  const rows = await db
    .select({ bookId: readingProgress.bookId, chapter: readingProgress.chapter })
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.planId, plan.id)));
  const readKeys = new Set(rows.map(chapterKey));
  const like = {
    bookIds: plan.bookIds,
    chaptersPerDay: plan.chaptersPerDay,
    startDate: plan.startDate,
  };
  const chapters = planChapters(plan.bookIds);
  const next = nextReading(chapters, readKeys, Math.max(1, plan.chaptersPerDay));
  // Chapters read today still count as "today's reading" so ticking them off stays visible.
  const readTodayRows = await db
    .select({ bookId: readingProgress.bookId, chapter: readingProgress.chapter })
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.planId, plan.id),
        eq(readingProgress.readOn, todayKey)
      )
    )
    .orderBy(asc(readingProgress.bookId), asc(readingProgress.chapter));
  const today = [
    ...readTodayRows.map((c) => ({ ...c, read: true })),
    ...next
      .filter((c) => !readTodayRows.some((r) => chapterKey(r) === chapterKey(c)))
      .map((c) => ({ ...c, read: false })),
  ].slice(0, Math.max(plan.chaptersPerDay, readTodayRows.length));
  return {
    plan,
    progress: planProgress(like, readKeys, todayKey),
    today,
    scheduled: scheduledForDay(like, todayKey),
    readKeys: [...readKeys],
  };
}

export type PrayerRow = PrayerEntry & { segment: SegmentRef };

export async function listPrayers(
  userId: string,
  filters: { kind?: PrayerEntry['kind']; lifeSegmentId?: string; answered?: boolean } = {}
): Promise<PrayerRow[]> {
  const conds = [eq(prayerEntries.userId, userId), isNull(prayerEntries.deletedAt)];
  if (filters.kind) conds.push(eq(prayerEntries.kind, filters.kind));
  if (filters.lifeSegmentId) conds.push(eq(prayerEntries.lifeSegmentId, filters.lifeSegmentId));
  if (filters.answered === true) conds.push(isNotNull(prayerEntries.answeredAt));
  if (filters.answered === false) conds.push(isNull(prayerEntries.answeredAt));
  const rows = await db
    .select({ entry: prayerEntries, segment: segmentRefColumns })
    .from(prayerEntries)
    .innerJoin(lifeSegments, eq(prayerEntries.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(desc(prayerEntries.date), desc(prayerEntries.createdAt));
  return rows.map((r) => ({ ...r.entry, segment: r.segment }));
}

export async function getDevotional(
  userId: string,
  dateKey: string
): Promise<(DevotionalEntry & { reference: ScriptureReference | null }) | null> {
  const [row] = await db
    .select({ entry: devotionalEntries, reference: scriptureReferences })
    .from(devotionalEntries)
    .leftJoin(scriptureReferences, eq(devotionalEntries.referenceId, scriptureReferences.id))
    .where(
      and(
        eq(devotionalEntries.userId, userId),
        eq(devotionalEntries.date, dateKey),
        isNull(devotionalEntries.deletedAt)
      )
    )
    .orderBy(desc(devotionalEntries.createdAt))
    .limit(1);
  return row ? { ...row.entry, reference: row.reference } : null;
}

export async function listDevotionals(
  userId: string,
  fromKey: string,
  toKey: string
): Promise<DevotionalEntry[]> {
  return db
    .select()
    .from(devotionalEntries)
    .where(
      and(
        eq(devotionalEntries.userId, userId),
        isNull(devotionalEntries.deletedAt),
        gte(devotionalEntries.date, fromKey),
        lte(devotionalEntries.date, toKey)
      )
    )
    .orderBy(desc(devotionalEntries.date));
}

/** Study options for pickers (prerequisites). */
export async function listStudyOptions(
  userId: string
): Promise<Array<Pick<BibleStudy, 'id' | 'title' | 'status'>>> {
  const rows = await db
    .select({ id: bibleStudies.id, title: bibleStudies.title, status: bibleStudies.status })
    .from(bibleStudies)
    .where(and(eq(bibleStudies.userId, userId), isNull(bibleStudies.deletedAt)))
    .orderBy(asc(bibleStudies.title));
  return rows;
}

export async function referencesByIds(
  userId: string,
  ids: string[]
): Promise<ScriptureReference[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(scriptureReferences)
    .where(and(eq(scriptureReferences.userId, userId), inArray(scriptureReferences.id, ids)));
}
