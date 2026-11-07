import 'server-only';
import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { habitCheckIns, habits, lifeSegments } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type Habit = typeof habits.$inferSelect;
export type HabitCheckIn = typeof habitCheckIns.$inferSelect;
export type HabitRow = Habit & { segment: SegmentRef };

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
  const checkIns = await listCheckInsBetween(userId, fromKey, todayKey);
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
    };
  });
}
