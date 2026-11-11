import 'server-only';
import { addDays, parseISO, startOfWeek } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { expandEvents } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { listGoals, listMilestones } from '@/features/goals/queries';
import { getHabitOverview, listCheckInsBetween } from '@/features/habits/queries';
import { listEntriesBetween } from '@/features/journal/queries';
import { listSegments } from '@/features/life-segments/service';
import { listProjects } from '@/features/projects/queries';
import { listReviews } from '@/features/reviews/queries';
import { getPreferences } from '@/features/settings/service';
import { countOpenTasksBySegment, listTasks } from '@/features/tasks/queries';
import { buildTimeAnalytics } from '@/features/time/service';
import { listMoodBetween } from '@/features/wellness/queries';
import { toDateKey, todayInZone } from '@/lib/dates';
import {
  goalCompletion,
  habitConsistency,
  lifeBalance,
  moodTrend,
  projectsAndMilestones,
  summarise,
  timeAllocation,
  type GoalCompletion,
  type HabitConsistency,
  type LifeBalance,
  type MoodTrend,
  type ProjectsAndMilestones,
  type Summary,
  type TimeAllocation,
} from './compute';
import { resolvePeriod, type ResolvedPeriod } from './period';

export type AnalyticsParams = { period?: string | string[]; start?: string | string[] };

export type AnalyticsData = {
  period: ResolvedPeriod;
  todayKey: string;
  goals: GoalCompletion;
  habits: HabitConsistency;
  time: TimeAllocation;
  projects: ProjectsAndMilestones;
  mood: MoodTrend;
  summary: Summary;
  balance: LifeBalance;
};

const isOpenGoal = (status: string) => status !== 'achieved' && status !== 'abandoned';

function dayKeysBetween(start: string, end: string): string[] {
  const keys: string[] = [];
  for (let d = parseISO(start), last = parseISO(end); d <= last; d = addDays(d, 1)) {
    keys.push(toDateKey(d));
  }
  return keys;
}

function countBy(ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = (out[id] ?? 0) + 1;
  return out;
}

/** Loads everything the Analytics page shows for one period, in the user's time zone. */
export async function getAnalyticsData(
  userId: string,
  params: AnalyticsParams
): Promise<AnalyticsData> {
  const prefs = await getPreferences(userId);
  const tz = prefs.timeZone;
  const now = new Date();
  const todayKey = toDateKey(todayInZone(tz, now));
  const period = resolvePeriod(params, todayKey, prefs.weekStartsOn);

  const localKey = (d: Date) => formatInTimeZone(d, tz, 'yyyy-MM-dd');
  const startOf = (key: string) => fromZonedTime(`${key}T00:00:00`, tz);
  const from = startOf(period.start);
  const to = startOf(toDateKey(addDays(parseISO(period.end), 1)));
  const previousFrom = startOf(period.previous.start);
  // Weekly habits are scored per whole week, so the first week may begin before the period.
  const checkInFrom = toDateKey(
    startOfWeek(parseISO(period.start), { weekStartsOn: prefs.weekStartsOn })
  );

  const [
    allSegments,
    goals,
    habits,
    checkIns,
    timeData,
    projects,
    milestones,
    moods,
    doneTasks,
    openTasksBySegment,
    eventRows,
    journal,
    reviews,
  ] = await Promise.all([
    listSegments(userId, { includeArchived: true }),
    listGoals(userId, { status: 'all' }),
    getHabitOverview(userId, todayKey, prefs.weekStartsOn),
    listCheckInsBetween(userId, checkInFrom, period.end),
    buildTimeAnalytics(userId, { from, to, dayKeys: dayKeysBetween(period.start, period.end) }, tz),
    listProjects(userId, { status: 'all' }),
    listMilestones(userId, { dueFrom: period.start, dueTo: period.end }),
    listMoodBetween(userId, period.start, period.end),
    listTasks(userId, { status: 'done' }),
    countOpenTasksBySegment(userId),
    listEventsBetween(userId, previousFrom, to),
    listEntriesBetween(userId, period.previous.start, period.end),
    listReviews(userId),
  ]);

  const segments = allSegments.filter((s) => s.archivedAt === null);
  const segmentInfo = allSegments.map((s) => ({ id: s.id, name: s.name, accent: s.accent }));
  const goalTitle = new Map(goals.map((g) => [g.id, g.title]));
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]));

  // Events that have already taken place, keyed by their local day.
  const eventKeys = expandEvents(eventRows, previousFrom, to)
    .filter((item) => (item.allDay ? item.start <= todayKey : new Date(item.start) <= now))
    .map((item) => (item.allDay ? item.start : localKey(new Date(item.start))));

  return {
    period,
    todayKey,
    goals: goalCompletion(
      goals.map((g) => ({
        id: g.id,
        title: g.title,
        horizon: g.horizon,
        status: g.status,
        progress: g.progress,
        targetDate: g.targetDate,
        updatedKey: localKey(g.updatedAt),
        lifeSegmentId: g.lifeSegmentId,
      })),
      period
    ),
    habits: habitConsistency(
      habits.map((h) => ({
        id: h.id,
        name: h.name,
        frequency: h.frequency,
        target: h.target,
        accent: h.accent ?? h.segment.accent,
        segmentName: h.segment.name,
        currentStreak: h.stats.currentStreak,
      })),
      checkIns.map((c) => ({ habitId: c.habitId, date: c.date, value: c.value })),
      period,
      todayKey,
      prefs.weekStartsOn
    ),
    time: timeAllocation(timeData.analytics.bySegment, segmentInfo),
    projects: projectsAndMilestones(
      projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        progress: p.progress,
        accent: p.segment.accent,
        segmentName: p.segment.name,
        dueDate: p.dueDate,
      })),
      milestones.map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate,
        done: m.completedAt !== null,
        parentTitle: m.goalId
          ? (goalTitle.get(m.goalId) ?? null)
          : m.projectId
            ? (projectTitle.get(m.projectId) ?? null)
            : null,
        href: m.goalId ? `/goals/${m.goalId}` : m.projectId ? `/projects/${m.projectId}` : null,
      })),
      todayKey
    ),
    mood: moodTrend(
      moods.map((m) => ({ date: m.date, mood: m.mood, energy: m.energy })),
      period.buckets
    ),
    summary: summarise(
      {
        tasksDone: doneTasks.map((t) => localKey(t.completedAt ?? t.updatedAt)),
        events: eventKeys,
        journalEntries: journal.map((j) => j.date),
        reviewsCompleted: reviews
          .filter((r) => r.completedAt !== null)
          .map((r) => localKey(r.completedAt as Date)),
      },
      period,
      period.previous
    ),
    balance: lifeBalance(
      segments.map((s) => ({ id: s.id, name: s.name, accent: s.accent, weight: s.weight })),
      openTasksBySegment,
      Object.fromEntries(timeData.analytics.bySegment.map((r) => [r.key, r.actual])),
      countBy(goals.filter((g) => isOpenGoal(g.status)).map((g) => g.lifeSegmentId))
    ),
  };
}
