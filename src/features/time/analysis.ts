import { formatInTimeZone } from 'date-fns-tz';
import type { ActivityType } from './schema';

/** Minimal shapes so the functions stay pure and testable. */
export type PlannedLike = {
  start: string | Date;
  end: string | Date;
  activityType: ActivityType;
  segmentId: string;
  projectId: string | null;
};
export type ActualLike = {
  startedAt: string | Date;
  endedAt: string | Date | null;
  durationMinutes: number | null;
  lifeSegmentId: string;
  projectId: string | null;
  /** Resolved from the linked block when there is one. */
  activityType?: ActivityType | null;
};

export type MinutesBy = Record<string, number>;
export type DayBucket = { key: string; planned: number; actual: number };
export type WeekAnalysis = {
  plannedTotal: number;
  actualTotal: number;
  planned: { byActivity: MinutesBy; bySegment: MinutesBy; byProject: MinutesBy };
  actual: { byActivity: MinutesBy; bySegment: MinutesBy; byProject: MinutesBy };
  byDay: DayBucket[];
};

const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));

/** Minutes of [start, end) that fall inside [from, to). */
export function clippedMinutes(
  start: string | Date,
  end: string | Date,
  from: Date,
  to: Date
): number {
  const s = Math.max(toDate(start).getTime(), from.getTime());
  const e = Math.min(toDate(end).getTime(), to.getTime());
  return e > s ? Math.round((e - s) / 60000) : 0;
}

/** Minutes an actual entry covers; a running entry counts up to `now`. */
export function actualMinutes(entry: ActualLike, now: Date = new Date()): number {
  if (entry.endedAt) {
    if (entry.durationMinutes !== null && entry.durationMinutes !== undefined)
      return entry.durationMinutes;
    return Math.max(
      0,
      Math.round((toDate(entry.endedAt).getTime() - toDate(entry.startedAt).getTime()) / 60000)
    );
  }
  return Math.max(0, Math.round((now.getTime() - toDate(entry.startedAt).getTime()) / 60000));
}

function add(map: MinutesBy, key: string, minutes: number) {
  if (minutes <= 0) return;
  map[key] = (map[key] ?? 0) + minutes;
}

export const NO_PROJECT = 'none';
export const NO_ACTIVITY = 'unlinked';

/**
 * Sums planned and actual minutes for [from, to) by activity type, segment,
 * project and day. Days are keyed by the user's time zone and clipped to the
 * range, so a block crossing midnight is split between the two days.
 */
export function analyseRange(
  planned: PlannedLike[],
  actual: ActualLike[],
  from: Date,
  to: Date,
  timeZone: string,
  now: Date = new Date()
): WeekAnalysis {
  const result: WeekAnalysis = {
    plannedTotal: 0,
    actualTotal: 0,
    planned: { byActivity: {}, bySegment: {}, byProject: {} },
    actual: { byActivity: {}, bySegment: {}, byProject: {} },
    byDay: [],
  };
  const dayKeys = dayKeysBetween(from, to, timeZone);
  const days = new Map(dayKeys.map((key) => [key, { key, planned: 0, actual: 0 }]));

  for (const p of planned) {
    const minutes = clippedMinutes(p.start, p.end, from, to);
    if (minutes === 0) continue;
    result.plannedTotal += minutes;
    add(result.planned.byActivity, p.activityType, minutes);
    add(result.planned.bySegment, p.segmentId, minutes);
    add(result.planned.byProject, p.projectId ?? NO_PROJECT, minutes);
    splitAcrossDays(toDate(p.start), toDate(p.end), from, to, timeZone, (key, m) => {
      const bucket = days.get(key);
      if (bucket) bucket.planned += m;
    });
  }
  for (const a of actual) {
    const start = toDate(a.startedAt);
    const end = a.endedAt
      ? toDate(a.endedAt)
      : new Date(start.getTime() + actualMinutes(a, now) * 60000);
    const minutes = clippedMinutes(start, end, from, to);
    if (minutes === 0) continue;
    result.actualTotal += minutes;
    add(result.actual.byActivity, a.activityType ?? NO_ACTIVITY, minutes);
    add(result.actual.bySegment, a.lifeSegmentId, minutes);
    add(result.actual.byProject, a.projectId ?? NO_PROJECT, minutes);
    splitAcrossDays(start, end, from, to, timeZone, (key, m) => {
      const bucket = days.get(key);
      if (bucket) bucket.actual += m;
    });
  }
  result.byDay = [...days.values()];
  return result;
}

/** yyyy-MM-dd keys, in the user's zone, for every calendar day touched by [from, to). */
export function dayKeysBetween(from: Date, to: Date, timeZone: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (let t = from.getTime(); t < to.getTime(); t += 60 * 60 * 1000) {
    const key = formatInTimeZone(new Date(t), timeZone, 'yyyy-MM-dd');
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  const last = formatInTimeZone(new Date(to.getTime() - 1), timeZone, 'yyyy-MM-dd');
  if (!seen.has(last)) keys.push(last);
  return keys;
}

function splitAcrossDays(
  start: Date,
  end: Date,
  from: Date,
  to: Date,
  timeZone: string,
  onDay: (key: string, minutes: number) => void
) {
  let cursor = new Date(Math.max(start.getTime(), from.getTime()));
  const stop = new Date(Math.min(end.getTime(), to.getTime()));
  while (cursor < stop) {
    const key = formatInTimeZone(cursor, timeZone, 'yyyy-MM-dd');
    // Walk forward in 15-minute steps until the day key changes or we reach the end.
    let next = new Date(cursor.getTime() + 15 * 60000);
    while (next < stop && formatInTimeZone(next, timeZone, 'yyyy-MM-dd') === key) {
      next = new Date(next.getTime() + 15 * 60000);
    }
    if (next > stop) next = stop;
    onDay(key, Math.round((next.getTime() - cursor.getTime()) / 60000));
    cursor = next;
  }
}

/** Percentage of planned time that was actually logged, capped at 100. */
export function plannedVsActualPercent(planned: number, actual: number): number {
  if (planned <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / planned) * 100));
}
