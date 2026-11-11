import { addDays, addMonths, format, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import type { WeekStartsOn } from '@/lib/dates';
import { ACTIVITY_TYPES, formatMinutes, type ActivityType } from './schema';

/**
 * Pure aggregation for the Time analytics page. Planned time is the expanded
 * time blocks; actual time is the time entries. Every minute is clipped to the
 * range and bucketed by the user's local day with date-fns-tz.
 */

// ───────────────────────── range ─────────────────────────

export type AnalyticsRange = 'week' | 'month';

export type ResolvedRange = {
  range: AnalyticsRange;
  /** yyyy-MM-dd of the first day. */
  startKey: string;
  /** yyyy-MM-dd of the last day (inclusive). */
  endKey: string;
  /** Local-day keys for every day in the range, in order. */
  dayKeys: string[];
  /** Instants: [from, to). */
  from: Date;
  to: Date;
  label: string;
  prevStartKey: string;
  nextStartKey: string;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function parseRange(value: string | string[] | undefined): AnalyticsRange {
  return value === 'month' ? 'month' : 'week';
}

/**
 * The week (starting on the user's first weekday) or month that contains
 * `start`, falling back to today when `start` is missing or not a date.
 */
export function resolveRange(
  params: { range?: string | string[]; start?: string | string[] },
  todayKey: string,
  timeZone: string,
  weekStartsOn: WeekStartsOn
): ResolvedRange {
  const range = parseRange(params.range);
  const requested = typeof params.start === 'string' ? params.start : '';
  const anchorKey = DATE_KEY.test(requested) && isValid(parseISO(requested)) ? requested : todayKey;
  const anchor = parseISO(anchorKey);
  const start = range === 'week' ? startOfWeek(anchor, { weekStartsOn }) : startOfMonth(anchor);
  const end = range === 'week' ? addDays(start, 7) : addMonths(start, 1);
  const startKey = format(start, 'yyyy-MM-dd');
  const endKey = format(addDays(end, -1), 'yyyy-MM-dd');
  const dayKeys: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) dayKeys.push(format(d, 'yyyy-MM-dd'));
  const label =
    range === 'week'
      ? `${format(start, 'd MMM')} – ${format(addDays(end, -1), 'd MMM yyyy')}`
      : format(start, 'MMMM yyyy');
  return {
    range,
    startKey,
    endKey,
    dayKeys,
    from: fromZonedTime(`${startKey}T00:00:00`, timeZone),
    to: fromZonedTime(`${format(end, 'yyyy-MM-dd')}T00:00:00`, timeZone),
    label,
    prevStartKey: format(
      range === 'week' ? addDays(start, -7) : addMonths(start, -1),
      'yyyy-MM-dd'
    ),
    nextStartKey: format(end, 'yyyy-MM-dd'),
  };
}

export function analyticsHref(range: AnalyticsRange, startKey?: string): string {
  const params = new URLSearchParams({ range });
  if (startKey) params.set('start', startKey);
  return `/time/analytics?${params.toString()}`;
}

// ───────────────────────── aggregation ─────────────────────────

export type PlannedItem = {
  /** ISO instants or Dates. */
  start: string | Date;
  end: string | Date;
  activityType: ActivityType;
  segmentId: string;
  projectId: string | null;
  taskId: string | null;
};

export type ActualItem = {
  startedAt: string | Date;
  endedAt: string | Date | null;
  /** Wins over `endedAt - startedAt` when present. */
  durationMinutes: number | null;
  lifeSegmentId: string;
  projectId: string | null;
  taskId: string | null;
};

export type ComparisonRow = {
  key: string;
  planned: number;
  actual: number;
  /** actual − planned; positive means more time than planned. */
  delta: number;
};
export type DayRow = { key: string; planned: number; actual: number };
export type MinutesRow = { key: string; minutes: number };

export type TimeAnalytics = {
  plannedTotal: number;
  actualTotal: number;
  delta: number;
  bySegment: ComparisonRow[];
  byProject: ComparisonRow[];
  /** Planned minutes per activity type, blocks only. */
  byActivity: Array<{ key: ActivityType; minutes: number }>;
  /** One row per local day of the range, in order. */
  byDay: DayRow[];
  /** Tasks with the most logged time, most first. */
  topTasks: MinutesRow[];
  busiestDay: DayRow | null;
  /** Days with any logged time. */
  daysLogged: number;
  isEmpty: boolean;
};

export const NO_PROJECT = 'none';

const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));
const MINUTE = 60_000;

/** Whole minutes of [start, end) that fall inside [from, to). */
export function overlapMinutes(start: Date, end: Date, from: Date, to: Date): number {
  const s = Math.max(start.getTime(), from.getTime());
  const e = Math.min(end.getTime(), to.getTime());
  return e > s ? Math.round((e - s) / MINUTE) : 0;
}

/** The [start, end) an entry covers; a running entry counts up to `now`. */
export function actualInterval(entry: ActualItem, now: Date): { start: Date; end: Date } {
  const start = toDate(entry.startedAt);
  if (entry.durationMinutes !== null && entry.durationMinutes !== undefined) {
    return { start, end: new Date(start.getTime() + entry.durationMinutes * MINUTE) };
  }
  const end = entry.endedAt ? toDate(entry.endedAt) : now;
  return { start, end: end > start ? end : start };
}

/** Local-day boundaries as instants: `dayKeys.length + 1` points, the last being `to`. */
function dayBoundaries(dayKeys: string[], to: Date, timeZone: string): Date[] {
  return [...dayKeys.map((key) => fromZonedTime(`${key}T00:00:00`, timeZone)), to];
}

function add(map: Map<string, number>, key: string, minutes: number) {
  if (minutes <= 0) return;
  map.set(key, (map.get(key) ?? 0) + minutes);
}

function compare(planned: Map<string, number>, actual: Map<string, number>): ComparisonRow[] {
  const keys = new Set([...planned.keys(), ...actual.keys()]);
  return [...keys]
    .map((key) => {
      const p = planned.get(key) ?? 0;
      const a = actual.get(key) ?? 0;
      return { key, planned: p, actual: a, delta: a - p };
    })
    .sort((x, y) => y.actual - x.actual || y.planned - x.planned || x.key.localeCompare(y.key));
}

export function analyseTime(
  planned: PlannedItem[],
  actual: ActualItem[],
  range: Pick<ResolvedRange, 'from' | 'to' | 'dayKeys'>,
  timeZone: string,
  options: { now?: Date; topTasks?: number } = {}
): TimeAnalytics {
  const now = options.now ?? new Date();
  const topN = options.topTasks ?? 5;
  const { from, to, dayKeys } = range;
  const bounds = dayBoundaries(dayKeys, to, timeZone);
  const days: DayRow[] = dayKeys.map((key) => ({ key, planned: 0, actual: 0 }));

  const bucketByDay = (start: Date, end: Date, field: 'planned' | 'actual') => {
    for (let i = 0; i < days.length; i++) {
      const minutes = overlapMinutes(start, end, bounds[i], bounds[i + 1]);
      if (minutes > 0) days[i][field] += minutes;
    }
  };

  const plannedBySegment = new Map<string, number>();
  const plannedByProject = new Map<string, number>();
  const plannedByActivity = new Map<string, number>();
  let plannedTotal = 0;
  for (const p of planned) {
    const start = toDate(p.start);
    const end = toDate(p.end);
    const minutes = overlapMinutes(start, end, from, to);
    if (minutes === 0) continue;
    plannedTotal += minutes;
    add(plannedBySegment, p.segmentId, minutes);
    add(plannedByProject, p.projectId ?? NO_PROJECT, minutes);
    add(plannedByActivity, p.activityType, minutes);
    bucketByDay(start, end, 'planned');
  }

  const actualBySegment = new Map<string, number>();
  const actualByProject = new Map<string, number>();
  const actualByTask = new Map<string, number>();
  let actualTotal = 0;
  for (const a of actual) {
    const { start, end } = actualInterval(a, now);
    const minutes = overlapMinutes(start, end, from, to);
    if (minutes === 0) continue;
    actualTotal += minutes;
    add(actualBySegment, a.lifeSegmentId, minutes);
    add(actualByProject, a.projectId ?? NO_PROJECT, minutes);
    if (a.taskId) add(actualByTask, a.taskId, minutes);
    bucketByDay(start, end, 'actual');
  }

  const byActivity = ACTIVITY_TYPES.map((key) => ({
    key,
    minutes: plannedByActivity.get(key) ?? 0,
  }))
    .filter((row) => row.minutes > 0)
    .sort((x, y) => y.minutes - x.minutes);
  const topTasks = [...actualByTask.entries()]
    .map(([key, minutes]) => ({ key, minutes }))
    .sort((x, y) => y.minutes - x.minutes || x.key.localeCompare(y.key))
    .slice(0, topN);
  const busiestDay = days.reduce<DayRow | null>(
    (best, day) => (day.actual > 0 && (!best || day.actual > best.actual) ? day : best),
    null
  );

  return {
    plannedTotal,
    actualTotal,
    delta: actualTotal - plannedTotal,
    bySegment: compare(plannedBySegment, actualBySegment),
    byProject: compare(plannedByProject, actualByProject),
    byActivity,
    byDay: days,
    topTasks,
    busiestDay,
    daysLogged: days.filter((d) => d.actual > 0).length,
    isEmpty: plannedTotal === 0 && actualTotal === 0,
  };
}

// ───────────────────────── display helpers ─────────────────────────

/** Width of a bar as a whole percentage of the largest value, 0–100. */
export function shareOf(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

/** "+1 h 30 min", "−45 min" or "On plan". */
export function formatDelta(minutes: number): string {
  if (minutes === 0) return 'On plan';
  return `${minutes > 0 ? '+' : '−'}${formatMinutes(Math.abs(minutes))}`;
}
