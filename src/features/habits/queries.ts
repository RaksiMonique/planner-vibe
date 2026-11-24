import 'server-only';
import { and, asc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  bibleStudies,
  courses,
  habitCheckIns,
  habitPlanItems,
  habits,
  lessons,
  lifeSegments,
  readingPlans,
  readingProgress,
  routineSteps,
  routines,
  subjects,
} from '@/db/schema';
import { describeChapters, nextReading, planChapters } from '@/features/faith/plans';
import { STUDY_STATUS_LABELS } from '@/features/faith/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import {
  HABIT_LINK_LABELS,
  linkHref,
  linkOf,
  nextPlanItem,
  type HabitLinkKind,
  type HabitLinkOption,
} from './links';

export type Habit = typeof habits.$inferSelect;
export type HabitCheckIn = typeof habitCheckIns.$inferSelect;
export type HabitPlanItem = typeof habitPlanItems.$inferSelect;
export type HabitRow = Habit & { segment: SegmentRef };

/** The thing a habit serves, resolved for display. */
export type HabitLink = {
  kind: HabitLinkKind;
  id: string;
  label: string;
  title: string;
  href: string;
  /** What the linked thing says comes next, e.g. the next lesson or reading. */
  next: string | null;
};

export type HabitPlanSummary = {
  open: number;
  done: number;
  next: HabitPlanItem | null;
};

export async function listHabits(
  userId: string,
  opts: { includeArchived?: boolean } = {}
): Promise<HabitRow[]> {
  const conds = [eq(habits.userId, userId), isNull(habits.deletedAt)];
  if (!opts.includeArchived) conds.push(isNull(habits.archivedAt));
  const rows = await db
    .select({ habit: habits, segment: segmentRefColumns })
    .from(habits)
    .innerJoin(lifeSegments, eq(habits.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(asc(habits.createdAt));
  return rows.map((r) => ({ ...r.habit, segment: r.segment }));
}

/** Check-ins with yyyy-MM-dd dates in [fromKey, toKey], inclusive. */
export async function listCheckInsBetween(
  userId: string,
  fromKey: string,
  toKey: string
): Promise<HabitCheckIn[]> {
  return db
    .select()
    .from(habitCheckIns)
    .where(
      and(
        eq(habitCheckIns.userId, userId),
        gte(habitCheckIns.date, fromKey),
        lte(habitCheckIns.date, toKey)
      )
    )
    .orderBy(asc(habitCheckIns.date));
}

/** Number of check-ins per habit inside a date range, keyed by habit id. */
export async function countCheckInsByHabit(
  userId: string,
  fromKey: string,
  toKey: string
): Promise<Record<string, number>> {
  const rows = await db
    .select({ habitId: habitCheckIns.habitId, count: sql<number>`count(*)::int` })
    .from(habitCheckIns)
    .where(
      and(
        eq(habitCheckIns.userId, userId),
        gte(habitCheckIns.date, fromKey),
        lte(habitCheckIns.date, toKey)
      )
    )
    .groupBy(habitCheckIns.habitId);
  return Object.fromEntries(rows.map((r) => [r.habitId, r.count]));
}

// ── Overview with streaks (used by the habits page, dashboard and weekly view) ──

import { subDays, parseISO } from 'date-fns';
import { toDateKey, type WeekStartsOn } from '@/lib/dates';
import {
  completionRate,
  currentStreak,
  longestStreak,
  periodSummary,
  type PeriodSummary,
} from './streaks';

export type HabitStats = {
  currentStreak: number;
  longestStreak: number;
  /** Percent of the target achieved over the last 30 days. */
  rate30: number;
  period: PeriodSummary;
};

export type HabitOverview = HabitRow & {
  /** A check-in exists for today. */
  doneToday: boolean;
  /** yyyy-MM-dd keys of every check-in in the loaded window. */
  checkInDates: string[];
  stats: HabitStats;
  link: HabitLink | null;
  plan: HabitPlanSummary;
  /** Routines with a step that checks this habit in. */
  routineNames: string[];
};

/** Active habits (or all, with archived) with their check-in history and streak maths. */
export async function getHabitOverview(
  userId: string,
  todayKey: string,
  weekStartsOn: WeekStartsOn,
  opts: { includeArchived?: boolean; historyDays?: number } = {}
): Promise<HabitOverview[]> {
  const rows = await listHabits(userId, { includeArchived: opts.includeArchived });
  if (rows.length === 0) return [];
  const fromKey = toDateKey(subDays(parseISO(todayKey), opts.historyDays ?? 400));
  const [checkIns, links, plans, inRoutines] = await Promise.all([
    listCheckInsBetween(userId, fromKey, todayKey),
    resolveLinks(userId, rows),
    planSummaries(userId, rows, todayKey),
    routinesByHabit(userId, rows),
  ]);
  return rows.map((habit) => {
    const own = checkIns.filter((c) => c.habitId === habit.id);
    const input = {
      checkIns: own.map((c) => ({ date: c.date, value: c.value })),
      frequency: habit.frequency,
      target: habit.target,
      todayKey,
      weekStartsOn,
    };
    return {
      ...habit,
      doneToday: own.some((c) => c.date === todayKey),
      checkInDates: own.map((c) => c.date),
      stats: {
        currentStreak: currentStreak(input),
        longestStreak: longestStreak(input),
        rate30: completionRate(input),
        period: periodSummary(input),
      },
      link: links.get(habit.id) ?? null,
      plan: plans.get(habit.id) ?? { open: 0, done: 0, next: null },
      routineNames: inRoutines.get(habit.id) ?? [],
    };
  });
}

export async function getHabitOverviewById(
  userId: string,
  id: string,
  todayKey: string,
  weekStartsOn: WeekStartsOn
): Promise<HabitOverview | null> {
  const all = await getHabitOverview(userId, todayKey, weekStartsOn, { includeArchived: true });
  return all.find((h) => h.id === id) ?? null;
}

/** Habits whose link points at one thing, e.g. every habit for a course. */
export async function listHabitsLinkedTo(
  userId: string,
  link: { kind: HabitLinkKind; id: string },
  todayKey: string,
  weekStartsOn: WeekStartsOn
): Promise<HabitOverview[]> {
  const all = await getHabitOverview(userId, todayKey, weekStartsOn);
  return all.filter((h) => h.link?.kind === link.kind && h.link.id === link.id);
}

// ── Links, plans and routines ──

export async function listPlanItems(userId: string, habitId: string): Promise<HabitPlanItem[]> {
  return db
    .select()
    .from(habitPlanItems)
    .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.habitId, habitId)))
    .orderBy(asc(habitPlanItems.sortOrder), asc(habitPlanItems.createdAt));
}

async function planSummaries(
  userId: string,
  rows: Habit[],
  todayKey: string
): Promise<Map<string, HabitPlanSummary>> {
  const items = await db
    .select()
    .from(habitPlanItems)
    .where(
      and(
        eq(habitPlanItems.userId, userId),
        inArray(
          habitPlanItems.habitId,
          rows.map((r) => r.id)
        )
      )
    )
    .orderBy(asc(habitPlanItems.sortOrder), asc(habitPlanItems.createdAt));
  const out = new Map<string, HabitPlanSummary>();
  for (const habit of rows) {
    const own = items.filter((i) => i.habitId === habit.id);
    out.set(habit.id, {
      open: own.filter((i) => i.completedAt === null).length,
      done: own.filter((i) => i.completedAt !== null).length,
      next: nextPlanItem(own, todayKey),
    });
  }
  return out;
}

async function routinesByHabit(userId: string, rows: Habit[]): Promise<Map<string, string[]>> {
  const steps = await db
    .select({ habitId: routineSteps.habitId, name: routines.name })
    .from(routineSteps)
    .innerJoin(routines, eq(routineSteps.routineId, routines.id))
    .where(
      and(
        eq(routineSteps.userId, userId),
        isNull(routines.deletedAt),
        inArray(
          routineSteps.habitId,
          rows.map((r) => r.id)
        )
      )
    );
  const out = new Map<string, string[]>();
  for (const s of steps) {
    if (!s.habitId) continue;
    const names = out.get(s.habitId) ?? [];
    if (!names.includes(s.name)) names.push(s.name);
    out.set(s.habitId, names);
  }
  return out;
}

const ids = (rows: Habit[], key: keyof Habit) => [
  ...new Set(rows.map((r) => r[key]).filter((v): v is string => typeof v === 'string')),
];

/** Titles and "what comes next" for every linked course, subject, study, plan and routine. */
async function resolveLinks(userId: string, rows: Habit[]): Promise<Map<string, HabitLink>> {
  const out = new Map<string, HabitLink>();
  const courseIds = ids(rows, 'courseId');
  const subjectIds = ids(rows, 'subjectId');
  const studyIds = ids(rows, 'bibleStudyId');
  const planIds = ids(rows, 'readingPlanId');
  const routineIds = ids(rows, 'routineId');

  const [
    courseRows,
    lessonRows,
    subjectRows,
    courseCounts,
    studyRows,
    planRows,
    progress,
    routineRows,
  ] = await Promise.all([
    courseIds.length
      ? db
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .where(and(eq(courses.userId, userId), inArray(courses.id, courseIds)))
      : [],
    courseIds.length
      ? db
          .select({ courseId: lessons.courseId, title: lessons.title })
          .from(lessons)
          .where(
            and(
              eq(lessons.userId, userId),
              inArray(lessons.courseId, courseIds),
              isNull(lessons.completedAt)
            )
          )
          .orderBy(asc(lessons.sortOrder), asc(lessons.createdAt))
      : [],
    subjectIds.length
      ? db
          .select({ id: subjects.id, name: subjects.name })
          .from(subjects)
          .where(and(eq(subjects.userId, userId), inArray(subjects.id, subjectIds)))
      : [],
    subjectIds.length
      ? db
          .select({ subjectId: courses.subjectId, n: sql<number>`count(*)::int` })
          .from(courses)
          .where(
            and(
              eq(courses.userId, userId),
              inArray(courses.subjectId, subjectIds),
              isNull(courses.deletedAt),
              sql`${courses.status} in ('planned', 'in_progress')`
            )
          )
          .groupBy(courses.subjectId)
      : [],
    studyIds.length
      ? db
          .select({ id: bibleStudies.id, title: bibleStudies.title, status: bibleStudies.status })
          .from(bibleStudies)
          .where(and(eq(bibleStudies.userId, userId), inArray(bibleStudies.id, studyIds)))
      : [],
    planIds.length
      ? db
          .select()
          .from(readingPlans)
          .where(and(eq(readingPlans.userId, userId), inArray(readingPlans.id, planIds)))
      : [],
    planIds.length
      ? db
          .select({
            planId: readingProgress.planId,
            bookId: readingProgress.bookId,
            chapter: readingProgress.chapter,
          })
          .from(readingProgress)
          .where(and(eq(readingProgress.userId, userId), inArray(readingProgress.planId, planIds)))
      : [],
    routineIds.length
      ? db
          .select({
            id: routines.id,
            name: routines.name,
            steps: sql<number>`(select count(*) from ${routineSteps} where ${routineSteps.routineId} = ${routines.id})::int`,
          })
          .from(routines)
          .where(and(eq(routines.userId, userId), inArray(routines.id, routineIds)))
      : [],
  ]);

  for (const habit of rows) {
    const link = linkOf(habit);
    if (!link) continue;
    const base = {
      kind: link.kind,
      id: link.id,
      label: HABIT_LINK_LABELS[link.kind],
      href: linkHref(link),
    };
    switch (link.kind) {
      case 'course': {
        const c = courseRows.find((r) => r.id === link.id);
        if (!c) break;
        const lesson = lessonRows.find((l) => l.courseId === c.id);
        out.set(habit.id, {
          ...base,
          title: c.title,
          next: lesson ? `Next lesson: ${lesson.title}` : null,
        });
        break;
      }
      case 'subject': {
        const s = subjectRows.find((r) => r.id === link.id);
        if (!s) break;
        const n = courseCounts.find((c) => c.subjectId === s.id)?.n ?? 0;
        out.set(habit.id, {
          ...base,
          title: s.name,
          next: n > 0 ? `${n} active course${n === 1 ? '' : 's'}` : null,
        });
        break;
      }
      case 'bible_study': {
        const s = studyRows.find((r) => r.id === link.id);
        if (!s) break;
        out.set(habit.id, { ...base, title: s.title, next: STUDY_STATUS_LABELS[s.status] });
        break;
      }
      case 'reading_plan': {
        const p = planRows.find((r) => r.id === link.id);
        if (!p) break;
        const read = new Set(
          progress.filter((r) => r.planId === p.id).map((r) => `${r.bookId}:${r.chapter}`)
        );
        const next = nextReading(planChapters(p.bookIds), read, Math.max(1, p.chaptersPerDay));
        out.set(habit.id, {
          ...base,
          title: p.name,
          next: next.length ? `Next reading: ${describeChapters(next)}` : 'Plan finished',
        });
        break;
      }
      case 'routine': {
        const r = routineRows.find((x) => x.id === link.id);
        if (!r) break;
        out.set(habit.id, {
          ...base,
          title: r.name,
          next: `${r.steps} step${r.steps === 1 ? '' : 's'}`,
        });
        break;
      }
    }
  }
  return out;
}

/** Everything a habit can be linked to, for the habit form. */
export async function listHabitLinkOptions(userId: string): Promise<HabitLinkOption[]> {
  const [courseRows, subjectRows, studyRows, planRows, routineRows] = await Promise.all([
    db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(
        and(
          eq(courses.userId, userId),
          isNull(courses.deletedAt),
          sql`${courses.status} in ('planned', 'in_progress')`
        )
      )
      .orderBy(asc(courses.title)),
    db
      .select({ id: subjects.id, title: subjects.name })
      .from(subjects)
      .where(
        and(eq(subjects.userId, userId), isNull(subjects.deletedAt), isNull(subjects.archivedAt))
      )
      .orderBy(asc(subjects.name)),
    db
      .select({ id: bibleStudies.id, title: bibleStudies.title })
      .from(bibleStudies)
      .where(
        and(
          eq(bibleStudies.userId, userId),
          isNull(bibleStudies.deletedAt),
          sql`${bibleStudies.status} <> 'done'`
        )
      )
      .orderBy(asc(bibleStudies.title)),
    db
      .select({ id: readingPlans.id, title: readingPlans.name })
      .from(readingPlans)
      .where(
        and(
          eq(readingPlans.userId, userId),
          isNull(readingPlans.deletedAt),
          sql`${readingPlans.status} <> 'done'`
        )
      )
      .orderBy(asc(readingPlans.name)),
    db
      .select({ id: routines.id, title: routines.name })
      .from(routines)
      .where(
        and(eq(routines.userId, userId), isNull(routines.deletedAt), eq(routines.isTemplate, false))
      )
      .orderBy(asc(routines.name)),
  ]);
  const tag = (kind: HabitLinkKind, list: Array<{ id: string; title: string }>) =>
    list.map((r) => ({ kind, id: r.id, title: r.title }));
  return [
    ...tag('course', courseRows),
    ...tag('subject', subjectRows),
    ...tag('bible_study', studyRows),
    ...tag('reading_plan', planRows),
    ...tag('routine', routineRows),
  ];
}
