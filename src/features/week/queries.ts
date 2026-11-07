import 'server-only';
import { addDays, format, isValid, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { expandEvents } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { listGoals, listMilestones, type GoalRow, type Milestone } from '@/features/goals/queries';
import { listCheckInsBetween, listHabits, type HabitRow } from '@/features/habits/queries';
import { listCompletionsBetween, listRoutines, type RoutineRow } from '@/features/routines/queries';
import { getPreferences } from '@/features/settings/service';
import { listTasks, type TaskRow } from '@/features/tasks/queries';
import { expandTimeBlocks } from '@/features/time/expand';
import { listTimeBlocksBetween } from '@/features/time/queries';
import type { Accent } from '@/lib/accents';
import { toDateKey, todayInZone, weekDays, type WeekStartsOn } from '@/lib/dates';

export type WeekEvent = {
  id: string;
  sourceId: string;
  title: string;
  /** HH:mm in the user's zone, null for all-day. */
  time: string | null;
  accent: Accent;
};
export type WeekBlock = {
  id: string;
  title: string;
  start: string;
  end: string;
  accent: Accent;
  recurring: boolean;
};
export type WeekRoutine = { routine: RoutineRow; doneStepIds: string[] };
export type WeekHabit = { habit: HabitRow; done: boolean };
export type WeekDay = {
  key: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  isToday: boolean;
  isPast: boolean;
  events: WeekEvent[];
  blocks: WeekBlock[];
  tasks: TaskRow[];
  milestones: Milestone[];
  routines: WeekRoutine[];
  habits: WeekHabit[];
};
export type WeekData = {
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
  keys: string[];
  title: string;
  prevKey: string;
  nextKey: string;
  days: WeekDay[];
  priorities: TaskRow[];
  goals: GoalRow[];
  openCount: number;
  doneCount: number;
};

/** `?date=` or today; anything unparsable falls back to today. */
export function resolveAnchor(dateParam: string | undefined, today: Date): Date {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const d = parseISO(dateParam);
    if (isValid(d)) return d;
  }
  return today;
}

export async function getWeekData(userId: string, dateParam?: string): Promise<WeekData> {
  const prefs = await getPreferences(userId);
  const tz = prefs.timeZone;
  const today = todayInZone(tz);
  const todayKey = toDateKey(today);
  const anchor = resolveAnchor(dateParam, today);
  const days = weekDays(anchor, prefs.weekStartsOn);
  const keys = days.map(toDateKey);
  const from = fromZonedTime(`${keys[0]}T00:00:00`, tz);
  const to = fromZonedTime(`${toDateKey(addDays(days[6], 1))}T00:00:00`, tz);

  const [
    eventRows,
    openTasks,
    doneTasks,
    milestones,
    blocks,
    habits,
    checkIns,
    routines,
    completions,
    goals,
  ] = await Promise.all([
    listEventsBetween(userId, from, to),
    listTasks(userId, { status: 'open', dueFrom: keys[0], dueTo: keys[6] }),
    listTasks(userId, { status: 'done', dueFrom: keys[0], dueTo: keys[6] }),
    listMilestones(userId, { dueFrom: keys[0], dueTo: keys[6] }),
    listTimeBlocksBetween(userId, from, to).catch(() => []),
    listHabits(userId),
    listCheckInsBetween(userId, keys[0], keys[6]),
    listRoutines(userId),
    listCompletionsBetween(userId, keys[0], keys[6]),
    listGoals(userId),
  ]);

  const dayOf = (iso: string, allDay: boolean) =>
    allDay ? iso : formatInTimeZone(new Date(iso), tz, 'yyyy-MM-dd');
  const events = expandEvents(eventRows, from, to).map((item) => ({
    key: dayOf(item.start, item.allDay),
    event: {
      id: item.id,
      sourceId: item.sourceId,
      title: item.title,
      time: item.allDay ? null : formatInTimeZone(new Date(item.start), tz, 'HH:mm'),
      accent: item.accent,
    } satisfies WeekEvent,
  }));
  const checked = new Set(checkIns.map((c) => `${c.habitId}|${c.date}`));
  const completionMap = new Map(
    completions.map((c) => [`${c.routineId}|${c.date}`, c.completedStepIds])
  );
  const tasks = [...openTasks, ...doneTasks];
  const segmentAccent = new Map(blocks.map((b) => [b.lifeSegmentId, b.segment.accent]));
  const blockItems = expandTimeBlocks(blocks, from, to);

  const daysOut: WeekDay[] = keys.map((key, i) => {
    const dayOfWeek = days[i].getDay();
    return {
      key,
      dayOfWeek,
      isToday: key === todayKey,
      isPast: key < todayKey,
      events: events.filter((e) => e.key === key).map((e) => e.event),
      blocks: blockItems
        .filter((b) => formatInTimeZone(new Date(b.start), tz, 'yyyy-MM-dd') === key)
        .map((b) => ({
          id: b.id,
          title: b.title,
          start: formatInTimeZone(new Date(b.start), tz, 'HH:mm'),
          end: formatInTimeZone(new Date(b.end), tz, 'HH:mm'),
          accent: segmentAccent.get(b.segmentId) ?? b.accent,
          recurring: b.recurring,
        })),
      tasks: tasks.filter((t) => t.dueDate === key),
      milestones: milestones.filter((m) => m.dueDate === key),
      routines: routines
        .filter((r) => r.daysOfWeek.includes(dayOfWeek))
        .map((routine) => ({
          routine,
          doneStepIds: completionMap.get(`${routine.id}|${key}`) ?? [],
        })),
      habits: habits.map((habit) => ({ habit, done: checked.has(`${habit.id}|${key}`) })),
    };
  });

  const priorities = openTasks
    .filter((t) => t.isImportant)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const weekGoals = goals.filter(
    (g) =>
      g.horizon === 'weekly' ||
      (g.targetDate !== null && g.targetDate >= keys[0] && g.targetDate <= keys[6])
  );

  return {
    todayKey,
    timeZone: tz,
    weekStartsOn: prefs.weekStartsOn,
    keys,
    title: `${format(days[0], 'd MMM')} – ${format(days[6], 'd MMM yyyy')}`,
    prevKey: toDateKey(addDays(days[0], -7)),
    nextKey: toDateKey(addDays(days[0], 7)),
    days: daysOut,
    priorities,
    goals: weekGoals,
    openCount: openTasks.length,
    doneCount: doneTasks.length,
  };
}
