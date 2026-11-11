import 'server-only';
import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { expandEvents } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { listGoals, listMilestones, type GoalRow, type Milestone } from '@/features/goals/queries';
import { listProjects, type ProjectRow } from '@/features/projects/queries';
import { findReview } from '@/features/reviews/queries';
import { getPreferences } from '@/features/settings/service';
import { listTasks, type TaskRow } from '@/features/tasks/queries';
import { listBoards, type BoardRow } from '@/features/vision/queries';
import { toDateKey, todayInZone } from '@/lib/dates';
import {
  inRange,
  monthLabel,
  monthOf,
  parseQuarterKey,
  parseYearKey,
  quarterKeyOf,
  quarterRange,
  shiftQuarter,
  shiftYear,
  yearKeyOf,
  yearRange,
  type QuarterRange,
  type YearRange,
} from './periods';

export type ReviewLink = { id: string; completedAt: Date | null } | null;
export type MilestoneRow = Milestone & { goalTitle: string | null; projectTitle: string | null };

type PeriodStats = {
  goalProgress: number;
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
};

const CLOSED = new Set(['achieved', 'abandoned']);
const isOpen = (g: GoalRow) => !CLOSED.has(g.status);

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

function withTitles(rows: Milestone[], goals: GoalRow[], projects: ProjectRow[]): MilestoneRow[] {
  const goalTitle = new Map(goals.map((g) => [g.id, g.title]));
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]));
  return rows
    .map((m) => ({
      ...m,
      goalTitle: m.goalId ? (goalTitle.get(m.goalId) ?? null) : null,
      projectTitle: m.projectId ? (projectTitle.get(m.projectId) ?? null) : null,
    }))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
}

function stats(
  objectives: GoalRow[],
  milestones: Milestone[],
  open: TaskRow[],
  done: TaskRow[]
): PeriodStats {
  return {
    goalProgress: average(objectives.map((g) => g.progress)),
    milestonesDone: milestones.filter((m) => m.completedAt !== null).length,
    milestonesTotal: milestones.length,
    tasksDone: done.length,
    tasksTotal: open.length + done.length,
  };
}

function reviewLink(row: { id: string; completedAt: Date | null } | null): ReviewLink {
  return row ? { id: row.id, completedAt: row.completedAt } : null;
}

export type QuarterData = {
  range: QuarterRange;
  prevKey: string;
  nextKey: string;
  currentKey: string;
  todayKey: string;
  objectives: GoalRow[];
  undated: GoalRow[];
  months: Array<{
    key: string;
    label: string;
    goals: GoalRow[];
    milestones: number;
    tasksOpen: number;
    tasksDone: number;
  }>;
  milestones: MilestoneRow[];
  deadlines: TaskRow[];
  projects: ProjectRow[];
  stats: PeriodStats;
  review: ReviewLink;
};

/** Objectives, milestones, deadlines and progress for one quarter (instructions.md 8.7). */
export async function getQuarterData(userId: string, quarterParam?: string): Promise<QuarterData> {
  const prefs = await getPreferences(userId);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const currentKey = quarterKeyOf(today);
  const key = parseQuarterKey(quarterParam) ? quarterParam! : currentKey;
  const range = quarterRange(key);

  const [goals, milestoneRows, openTasks, doneTasks, projects, review] = await Promise.all([
    listGoals(userId, { status: 'all' }),
    listMilestones(userId, { dueFrom: range.start, dueTo: range.end }),
    listTasks(userId, { status: 'open', dueFrom: range.start, dueTo: range.end }),
    listTasks(userId, { status: 'done', dueFrom: range.start, dueTo: range.end }),
    listProjects(userId, { status: 'all' }),
    findReview(userId, 'quarterly', range.start),
  ]);

  const quarterly = goals.filter((g) => g.horizon === 'quarterly');
  const objectives = quarterly.filter((g) => inRange(g.targetDate, range.start, range.end));
  const undated = key === currentKey ? quarterly.filter((g) => !g.targetDate && isOpen(g)) : [];
  const monthly = goals.filter((g) => g.horizon === 'monthly');
  const months = range.months.map((m) => ({
    key: m,
    label: monthLabel(m, 'MMMM'),
    goals: monthly.filter((g) => g.targetDate && monthOf(g.targetDate) === m),
    milestones: milestoneRows.filter((x) => x.dueDate && monthOf(x.dueDate) === m).length,
    tasksOpen: openTasks.filter((t) => t.dueDate && monthOf(t.dueDate) === m).length,
    tasksDone: doneTasks.filter((t) => t.dueDate && monthOf(t.dueDate) === m).length,
  }));
  const projectIds = new Set(milestoneRows.map((m) => m.projectId).filter(Boolean));
  const inPlay = projects.filter(
    (p) =>
      p.status !== 'done' &&
      (projectIds.has(p.id) ||
        inRange(p.dueDate, range.start, range.end) ||
        inRange(p.startDate, range.start, range.end))
  );

  return {
    range,
    prevKey: shiftQuarter(key, -1),
    nextKey: shiftQuarter(key, 1),
    currentKey,
    todayKey,
    objectives,
    undated,
    months,
    milestones: withTitles(milestoneRows, goals, projects),
    deadlines: openTasks
      .filter((t) => t.dueDate)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
      .slice(0, 20),
    projects: inPlay,
    stats: stats(objectives, milestoneRows, openTasks, doneTasks),
    review: reviewLink(review),
  };
}

export type YearData = {
  range: YearRange;
  prevKey: string;
  nextKey: string;
  currentKey: string;
  todayKey: string;
  objectives: GoalRow[];
  undated: GoalRow[];
  quarters: Array<{
    range: QuarterRange;
    goals: GoalRow[];
    milestones: number;
    progress: number;
    isCurrent: boolean;
  }>;
  months: Array<{
    key: string;
    label: string;
    events: number;
    milestones: number;
    tasks: number;
    isCurrent: boolean;
  }>;
  milestones: MilestoneRow[];
  stats: PeriodStats;
  review: ReviewLink;
};

/** Objectives, the year at a glance and the quarterly breakdown (instructions.md 8.8). */
export async function getYearData(userId: string, yearParam?: string): Promise<YearData> {
  const prefs = await getPreferences(userId);
  const tz = prefs.timeZone;
  const today = todayInZone(tz);
  const todayKey = toDateKey(today);
  const currentKey = yearKeyOf(today);
  const key = parseYearKey(yearParam) ? yearParam! : currentKey;
  const range = yearRange(key);
  const from = fromZonedTime(`${range.start}T00:00:00`, tz);
  const to = fromZonedTime(`${toDateKey(addDays(parseISO(range.end), 1))}T00:00:00`, tz);

  const [goals, milestoneRows, openTasks, doneTasks, projects, eventRows, review] =
    await Promise.all([
      listGoals(userId, { status: 'all' }),
      listMilestones(userId, { dueFrom: range.start, dueTo: range.end }),
      listTasks(userId, { status: 'open', dueFrom: range.start, dueTo: range.end }),
      listTasks(userId, { status: 'done', dueFrom: range.start, dueTo: range.end }),
      listProjects(userId, { status: 'all' }),
      listEventsBetween(userId, from, to),
      findReview(userId, 'annual', range.start),
    ]);

  const annual = goals.filter((g) => g.horizon === 'annual');
  const objectives = annual.filter((g) => inRange(g.targetDate, range.start, range.end));
  const undated = key === currentKey ? annual.filter((g) => !g.targetDate && isOpen(g)) : [];
  const quarterly = goals.filter((g) => g.horizon === 'quarterly');
  const quarters = range.quarters.map((q) => {
    const qGoals = quarterly.filter((g) => inRange(g.targetDate, q.start, q.end));
    return {
      range: q,
      goals: qGoals,
      milestones: milestoneRows.filter((m) => inRange(m.dueDate, q.start, q.end)).length,
      progress: average(qGoals.map((g) => g.progress)),
      isCurrent: q.key === quarterKeyOf(today),
    };
  });
  const eventMonths = expandEvents(eventRows, from, to).map((item) =>
    item.allDay ? item.start.slice(0, 7) : formatInTimeZone(new Date(item.start), tz, 'yyyy-MM')
  );
  const allTasks = [...openTasks, ...doneTasks];
  const months = range.months.map((m) => ({
    key: m,
    label: monthLabel(m, 'MMM'),
    events: eventMonths.filter((x) => x === m).length,
    milestones: milestoneRows.filter((x) => x.dueDate && monthOf(x.dueDate) === m).length,
    tasks: allTasks.filter((t) => t.dueDate && monthOf(t.dueDate) === m).length,
    isCurrent: m === todayKey.slice(0, 7),
  }));

  return {
    range,
    prevKey: shiftYear(key, -1),
    nextKey: shiftYear(key, 1),
    currentKey,
    todayKey,
    objectives,
    undated,
    quarters,
    months,
    milestones: withTitles(milestoneRows, goals, projects).slice(0, 30),
    stats: stats(objectives, milestoneRows, openTasks, doneTasks),
    review: reviewLink(review),
  };
}

export type LifelongGoal = GoalRow & {
  children: GoalRow[];
  boards: BoardRow[];
  milestones: Milestone[];
};

export type LifelongData = {
  todayKey: string;
  aspirations: LifelongGoal[];
  closed: GoalRow[];
  /** Lifelong goals and their direct children, for the horizon timeline. */
  timelineGoals: GoalRow[];
  milestoneTimeline: Array<Milestone & { goalTitle: string }>;
};

/** Long-term aspirations with their milestones, vision boards and shorter-term goals (8.9). */
export async function getLifelongData(userId: string): Promise<LifelongData> {
  const prefs = await getPreferences(userId);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const [goals, milestones, boards] = await Promise.all([
    listGoals(userId, { status: 'all' }),
    listMilestones(userId),
    listBoards(userId).catch(() => [] as BoardRow[]),
  ]);
  const lifelong = goals.filter((g) => g.horizon === 'lifelong');
  const open = lifelong.filter(isOpen);
  const aspirations: LifelongGoal[] = open.map((g) => ({
    ...g,
    children: goals.filter((c) => c.parentGoalId === g.id && isOpen(c)),
    boards: boards.filter((b) => b.goalId === g.id),
    milestones: milestones.filter((m) => m.goalId === g.id),
  }));
  const lifelongIds = new Set(open.map((g) => g.id));
  const titles = new Map(open.map((g) => [g.id, g.title]));
  return {
    todayKey,
    aspirations,
    closed: lifelong.filter((g) => !isOpen(g)),
    timelineGoals: [
      ...open,
      ...goals.filter((c) => c.parentGoalId && lifelongIds.has(c.parentGoalId)),
    ],
    milestoneTimeline: milestones
      .filter((m) => m.goalId && lifelongIds.has(m.goalId))
      .map((m) => ({ ...m, goalTitle: titles.get(m.goalId!) ?? '' }))
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
  };
}
