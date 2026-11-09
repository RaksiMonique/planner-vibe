import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import type { WeekStartsOn } from '@/lib/dates';

export type MoodPoint = { date: string; mood: number; energy: number };
export type ValuePoint = { date: string; value: number | string | null };

const round1 = (n: number) => Math.round(n * 10) / 10;
const key = (d: Date) => format(d, 'yyyy-MM-dd');

/** Average mood and energy over the points, or null when there are none. */
export function averages(points: MoodPoint[]): { mood: number | null; energy: number | null } {
  if (points.length === 0) return { mood: null, energy: null };
  const mood = points.reduce((n, p) => n + p.mood, 0) / points.length;
  const energy = points.reduce((n, p) => n + p.energy, 0) / points.length;
  return { mood: round1(mood), energy: round1(energy) };
}

/** Averages per week (keyed by the week's first day), oldest first. */
export function weeklyAverages(
  points: MoodPoint[],
  weekStartsOn: WeekStartsOn
): Array<{ weekStart: string; mood: number; energy: number; count: number }> {
  const groups = new Map<string, MoodPoint[]>();
  for (const p of points) {
    const ws = key(startOfWeek(parseISO(p.date), { weekStartsOn }));
    groups.set(ws, [...(groups.get(ws) ?? []), p]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, pts]) => {
      const avg = averages(pts);
      return { weekStart, mood: avg.mood ?? 0, energy: avg.energy ?? 0, count: pts.length };
    });
}

/** The highest and lowest mood days; ties go to the most recent day. */
export function bestAndWorst(points: MoodPoint[]): {
  best: MoodPoint | null;
  worst: MoodPoint | null;
} {
  if (points.length === 0) return { best: null, worst: null };
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let best = sorted[0];
  let worst = sorted[0];
  for (const p of sorted) {
    if (p.mood >= best.mood) best = p;
    if (p.mood <= worst.mood) worst = p;
  }
  return { best, worst };
}

/** Consecutive days with a check-in ending today or yesterday. */
export function checkInStreak(dateKeys: string[], todayKey: string): number {
  const have = new Set(dateKeys);
  const today = parseISO(todayKey);
  let cursor = have.has(todayKey) ? today : addDays(today, -1);
  if (!have.has(key(cursor))) return 0;
  let streak = 0;
  while (have.has(key(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The last `n` date keys ending on `todayKey`, oldest first. */
export function lastDays(todayKey: string, n: number): string[] {
  const today = parseISO(todayKey);
  return Array.from({ length: n }, (_, i) => key(addDays(today, i - (n - 1))));
}

/** Sum of numeric values per day, keyed by date; days without entries are 0. */
export function totalsByDay(points: ValuePoint[], dayKeys: string[]): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(dayKeys.map((d) => [d, 0]));
  for (const p of points) {
    if (!(p.date in totals)) continue;
    totals[p.date] += Number(p.value ?? 0);
  }
  return totals;
}

export function sumValues(points: ValuePoint[]): number {
  return round1(points.reduce((n, p) => n + Number(p.value ?? 0), 0));
}

/** Days since a date key, negative when it lies ahead. */
export function daysSince(dateKey: string, todayKey: string): number {
  return differenceInCalendarDays(parseISO(todayKey), parseISO(dateKey));
}
