import 'server-only';
import { addDays, getDayOfYear, isBefore } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { listEventsBetween, type EventRow } from '@/features/calendar/queries';
import { listCaptures, type Capture } from '@/features/capture/queries';
import { listGoals, listMilestones, type GoalRow, type Milestone } from '@/features/goals/queries';
import { listSegments, type LifeSegment } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { countOpenTasksBySegment, listTasks, type TaskRow } from '@/features/tasks/queries';
import {
  dueStatus,
  formatLongDate,
  greetingFor,
  toDateKey,
  todayInZone,
  weekDays,
  type DueStatus,
  type WeekStartsOn,
} from '@/lib/dates';
import { quoteForDay } from './quotes';

export type DayCell = {
  key: string;
  isToday: boolean;
  events: EventRow[];
  tasks: TaskRow[];
  milestones: Milestone[];
};

export type DashboardData = {
  greeting: string;
  name: string;
  dateLabel: string;
  today: Date;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  week: DayCell[];
  priorities: Array<TaskRow & { due: DueStatus }>;
  dueThisWeek: Array<TaskRow & { due: DueStatus }>;
  overdue: Array<TaskRow & { due: DueStatus }>;
  openCount: number;
  doneTodayCount: number;
  goals: GoalRow[];
  appointments: EventRow[];
  captures: Capture[];
  segments: Array<LifeSegment & { openTasks: number }>;
  quote: { quote: string; author: string };
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const prefs = await getPreferences(userId);
  const now = new Date();
  const today = todayInZone(prefs.timeZone, now);
  const todayKey = toDateKey(today);
  const days = weekDays(today, prefs.weekStartsOn);
  const weekKeys = days.map(toDateKey);
  const rangeStart = isBefore(days[0], today) ? days[0] : today;
  const rangeEnd =
    addDays(today, 8) > addDays(days[6], 1) ? addDays(today, 8) : addDays(days[6], 1);

  const [profile] = await db
    .select({ displayName: profiles.displayName, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  const [segments, openCounts, openTasks, doneTasks, events, milestones, goals, captures] =
    await Promise.all([
      listSegments(userId),
      countOpenTasksBySegment(userId),
      listTasks(userId, { status: 'open', parentTaskId: null }),
      listTasks(userId, { status: 'done' }),
      listEventsBetween(userId, rangeStart, rangeEnd),
      listMilestones(userId, { dueFrom: weekKeys[0], dueTo: weekKeys[6], open: true }),
      listGoals(userId),
      listCaptures(userId),
    ]);

  const classified = openTasks.map((t) => ({
    ...t,
    due: dueStatus(t.dueDate, today, prefs.weekStartsOn),
  }));
  const byPriority = (a: (typeof classified)[number], b: (typeof classified)[number]) =>
    Number(b.isImportant) - Number(a.isImportant) ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  const priorities = classified
    .filter((t) => t.due === 'today' || t.due === 'overdue')
    .sort(byPriority);
  const overdue = classified.filter((t) => t.due === 'overdue');
  const dueThisWeek = classified.filter((t) => t.due === 'this_week');

  const eventDay = (e: EventRow) =>
    e.isAllDay
      ? (e.allDayDate ?? '')
      : toDateKey(toZonedTime(e.startsAt ?? e.createdAt, prefs.timeZone));

  const week: DayCell[] = weekKeys.map((key) => ({
    key,
    isToday: key === todayKey,
    events: events.filter((e) => eventDay(e) === key),
    tasks: openTasks.filter((t) => t.dueDate === key),
    milestones: milestones.filter((m) => m.dueDate === key),
  }));

  const horizon = toDateKey(addDays(today, 7));
  const appointments = events
    .filter(
      (e) =>
        (e.category === 'appointment' || e.category === 'self_care') &&
        eventDay(e) >= todayKey &&
        eventDay(e) <= horizon
    )
    .sort((a, b) => eventDay(a).localeCompare(eventDay(b)))
    .slice(0, 5);

  const topGoals = [...goals]
    .sort((a, b) => (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999'))
    .slice(0, 5);

  const doneTodayCount = doneTasks.filter(
    (t) => t.completedAt && toDateKey(toZonedTime(t.completedAt, prefs.timeZone)) === todayKey
  ).length;

  return {
    greeting: greetingFor(toZonedTime(now, prefs.timeZone).getHours()),
    name: profile?.displayName?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'there',
    dateLabel: formatLongDate(today),
    today,
    todayKey,
    weekStartsOn: prefs.weekStartsOn,
    week,
    priorities,
    dueThisWeek,
    overdue,
    openCount: openTasks.length,
    doneTodayCount,
    goals: topGoals,
    appointments,
    captures,
    segments: segments.map((s) => ({ ...s, openTasks: openCounts[s.id] ?? 0 })),
    quote: quoteForDay(getDayOfYear(today)),
  };
}
