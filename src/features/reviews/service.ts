import 'server-only';
import { differenceInCalendarDays, min as minDate, parseISO } from 'date-fns';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { listGoals, type GoalRow } from '@/features/goals/queries';
import { listCheckInsBetween, listHabits } from '@/features/habits/queries';
import { listSegments } from '@/features/life-segments/service';
import { listTasks } from '@/features/tasks/queries';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { toDateKey, todayInZone, type WeekStartsOn } from '@/lib/dates';
import { findReview, getReview, type Review, type ReviewRow } from './queries';
import { periodFor, type ReviewKind } from './templates';

export async function getReviewOrThrow(userId: string, id: string): Promise<ReviewRow> {
  const row = await getReview(userId, id);
  if (!row) throw new NotFoundError('That review does not exist.');
  return row;
}

async function defaultSegmentId(userId: string): Promise<string> {
  const segments = await listSegments(userId);
  const id = segments.find((s) => s.slug === 'growth')?.id ?? segments[0]?.id;
  if (!id) throw new ValidationError('Create a Life Segment first.');
  return id;
}

/**
 * Returns the review for a period (or goal), creating it when it does not
 * exist yet. Period reviews use the user's week start and time zone.
 */
export async function openReview(
  userId: string,
  input: { kind: ReviewKind; date?: string; goalId?: string },
  prefs: { timeZone: string; weekStartsOn: WeekStartsOn }
): Promise<Review> {
  const today = todayInZone(prefs.timeZone);
  const anchor = input.date ? parseISO(input.date) : today;

  if (input.kind === 'goal') {
    if (!input.goalId) throw new ValidationError('Choose a goal to review.');
    const goal = (await listGoals(userId, { status: 'all' })).find((g) => g.id === input.goalId);
    if (!goal) throw new NotFoundError('That goal does not exist.');
    const key = toDateKey(today);
    const existing = await findReview(userId, 'goal', key, goal.id);
    if (existing) return existing;
    const [row] = await db
      .insert(reviews)
      .values({
        userId,
        lifeSegmentId: goal.lifeSegmentId,
        kind: 'goal',
        periodStart: key,
        periodEnd: key,
        goalId: goal.id,
      })
      .returning();
    return row;
  }

  const { start, end } = periodFor(input.kind, anchor, prefs.weekStartsOn);
  const startKey = toDateKey(start);
  const existing = await findReview(userId, input.kind, startKey);
  if (existing) return existing;
  const [row] = await db
    .insert(reviews)
    .values({
      userId,
      lifeSegmentId: await defaultSegmentId(userId),
      kind: input.kind,
      periodStart: startKey,
      periodEnd: toDateKey(end),
    })
    .returning();
  return row;
}

/** Merges answers into the review; `complete` toggles completion. */
export async function saveAnswers(
  userId: string,
  id: string,
  patch: Record<string, string>,
  opts: { summary?: string; complete?: boolean } = {}
): Promise<Review> {
  const current = await getReviewOrThrow(userId, id);
  const answers = { ...current.answers };
  for (const [k, v] of Object.entries(patch)) {
    if (v.trim()) answers[k] = v;
    else delete answers[k];
  }
  const [row] = await db
    .update(reviews)
    .set({
      answers,
      ...(opts.summary !== undefined ? { summary: opts.summary || null } : {}),
      ...(opts.complete !== undefined ? { completedAt: opts.complete ? new Date() : null } : {}),
    })
    .where(and(eq(reviews.userId, userId), eq(reviews.id, id), isNull(reviews.deletedAt)))
    .returning();
  return row;
}

export async function removeReview(userId: string, id: string): Promise<void> {
  await getReviewOrThrow(userId, id);
  await db
    .update(reviews)
    .set({ deletedAt: new Date() })
    .where(and(eq(reviews.userId, userId), eq(reviews.id, id)));
}

export type ReviewStats = {
  tasksDone: number;
  tasksOpen: number;
  /** Daily habit check-ins over possible check-ins in the elapsed part of the period, 0 to 100, or null without daily habits. */
  habitRate: number | null;
  goals: Array<Pick<GoalRow, 'id' | 'title' | 'progress' | 'horizon' | 'status'>>;
};

/** Numbers to prefill the review's stats block, computed on read so they stay current. */
export async function reviewStats(
  userId: string,
  review: Review,
  timeZone: string
): Promise<ReviewStats> {
  const today = todayInZone(timeZone);
  const start = parseISO(review.periodStart);
  const end = parseISO(review.periodEnd);
  const elapsedEnd = minDate([end, today]);
  const elapsedDays = Math.max(0, differenceInCalendarDays(elapsedEnd, start) + 1);

  const [done, open, habits, checkIns, allGoals] = await Promise.all([
    listTasks(userId, { status: 'done', dueFrom: review.periodStart, dueTo: review.periodEnd }),
    listTasks(userId, { status: 'open', dueFrom: review.periodStart, dueTo: review.periodEnd }),
    listHabits(userId),
    listCheckInsBetween(userId, review.periodStart, toDateKey(elapsedEnd)),
    listGoals(userId, { status: 'all' }),
  ]);
  const daily = habits.filter((h) => h.frequency === 'daily');
  const possible = daily.length * elapsedDays;
  const dailyIds = new Set(daily.map((h) => h.id));
  const dailyCheckIns = checkIns.filter((c) => dailyIds.has(c.habitId)).length;
  const habitRate = possible > 0 ? Math.round((dailyCheckIns / possible) * 100) : null;

  const goals =
    review.kind === 'goal'
      ? allGoals.filter((g) => g.id === review.goalId)
      : allGoals.filter(
          (g) =>
            g.horizon === review.kind &&
            (g.status === 'active' || g.status === 'achieved' || g.status === 'planned')
        );
  const withTarget = allGoals.filter(
    (g) =>
      g.targetDate &&
      g.targetDate >= review.periodStart &&
      g.targetDate <= review.periodEnd &&
      !goals.some((x) => x.id === g.id)
  );
  return {
    tasksDone: done.length,
    tasksOpen: open.length,
    habitRate,
    goals: [...goals, ...withTarget].slice(0, 12).map((g) => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      horizon: g.horizon,
      status: g.status,
    })),
  };
}
