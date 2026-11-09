import 'server-only';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { expandEvents } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { listGoals, listMilestones, type GoalRow, type Milestone } from '@/features/goals/queries';
import { listCheckInsBetween, listHabits, type HabitRow } from '@/features/habits/queries';
import { getPreferences } from '@/features/settings/service';
import { listTasks, type TaskRow } from '@/features/tasks/queries';
import { toDateKey, todayInZone, type WeekStartsOn } from '@/lib/dates';
import {
  buildMonthGrid,
  daysElapsed,
  groupByWeek,
  monthKeyOf,
  parseMonthKey,
  shiftMonth,
  type MonthRow,
} from './grid';

export type MonthCellData = {
  key: string;
  inMonth: boolean;
  isToday: boolean;
  events: number;
  tasks: number;
  milestones: number;
  habitsDone: number;
};
export type MonthData = {
  monthKey: string;
  title: string;
  prevKey: string;
  nextKey: string;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  rows: Array<Omit<MonthRow, 'cells'> & { cells: MonthCellData[] }>;
  goals: GoalRow[];
  milestones: Milestone[];
  tasksByWeek: Array<{ start: string; end: string; items: TaskRow[] }>;
  habitSummary: Array<{ habit: HabitRow; checked: number; daysSoFar: number }>;
  habitCount: number;
  openTasks: number;
  doneTasks: number;
};

export async function getMonthData(userId: string, monthParam?: string): Promise<MonthData> {
  const prefs = await getPreferences(userId);
  const tz = prefs.timeZone;
  const today = todayInZone(tz);
  const todayKey = toDateKey(today);
  const first = parseMonthKey(monthParam) ?? today;
  const monthKey = monthKeyOf(first);
  const rows = buildMonthGrid(monthKey, prefs.weekStartsOn);
  const firstKey = rows[0].start;
  const lastKey = rows[rows.length - 1].end;
  const monthStart = `${monthKey}-01`;
  const monthEnd = toDateKey(addDays(parseISO(rows[rows.length - 1].end), 0));
  const monthLastKey = toDateKey(
    new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0)
  );
  const from = fromZonedTime(`${firstKey}T00:00:00`, tz);
  const to = fromZonedTime(`${toDateKey(addDays(parseISO(lastKey), 1))}T00:00:00`, tz);

  const [eventRows, openTasks, doneTasks, milestones, habits, checkIns, goals] = await Promise.all([
    listEventsBetween(userId, from, to),
    listTasks(userId, { status: 'open', dueFrom: firstKey, dueTo: lastKey }),
    listTasks(userId, { status: 'done', dueFrom: firstKey, dueTo: lastKey }),
    listMilestones(userId, { dueFrom: firstKey, dueTo: lastKey }),
    listHabits(userId),
    listCheckInsBetween(userId, firstKey, lastKey),
    listGoals(userId),
  ]);
  void monthEnd;

  const eventKeys = expandEvents(eventRows, from, to).map((item) =>
    item.allDay ? item.start : formatInTimeZone(new Date(item.start), tz, 'yyyy-MM-dd')
  );
  const count = (keys: string[]) =>
    keys.reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {});
  const eventCount = count(eventKeys);
  const taskCount = count(openTasks.map((t) => t.dueDate ?? ''));
  const milestoneCount = count(milestones.map((m) => m.dueDate ?? ''));
  const habitDoneCount = count(checkIns.map((c) => c.date));

  const cells = rows.map((row) => ({
    start: row.start,
    end: row.end,
    cells: row.cells.map((c) => ({
      key: c.key,
      inMonth: c.inMonth,
      isToday: c.key === todayKey,
      events: eventCount[c.key] ?? 0,
      tasks: taskCount[c.key] ?? 0,
      milestones: milestoneCount[c.key] ?? 0,
      habitsDone: habitDoneCount[c.key] ?? 0,
    })),
  }));

  const inMonth = (key: string | null) => key !== null && key >= monthStart && key <= monthLastKey;
  const monthGoals = goals.filter((g) => g.horizon === 'monthly' || inMonth(g.targetDate));
  const monthMilestones = milestones
    .filter((m) => inMonth(m.dueDate))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const tasksByWeek = groupByWeek(
    openTasks.filter((t) => inMonth(t.dueDate)),
    (t) => t.dueDate,
    rows
  )
    .filter((w) => w.items.length > 0)
    .map(({ start, end, items }) => ({ start, end, items }));

  const soFar = daysElapsed(monthKey, todayKey);
  const habitSummary = habits.map((habit) => ({
    habit,
    checked: checkIns.filter((c) => c.habitId === habit.id && inMonth(c.date) && c.date <= todayKey)
      .length,
    daysSoFar: soFar,
  }));

  return {
    monthKey,
    title: format(first, 'MMMM yyyy'),
    prevKey: shiftMonth(monthKey, -1),
    nextKey: shiftMonth(monthKey, 1),
    todayKey,
    weekStartsOn: prefs.weekStartsOn,
    rows: cells,
    goals: monthGoals,
    milestones: monthMilestones,
    tasksByWeek,
    habitSummary,
    habitCount: habits.length,
    openTasks: openTasks.filter((t) => inMonth(t.dueDate)).length,
    doneTasks: doneTasks.filter((t) => inMonth(t.dueDate)).length,
  };
}
