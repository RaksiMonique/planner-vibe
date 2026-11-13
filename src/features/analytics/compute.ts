import { addDays, addMonths, addWeeks, format, parseISO } from 'date-fns';
import { HORIZON_ORDER, type Horizon } from '@/features/goals/progress';
import type { HabitFrequency } from '@/features/habits/schema';
import { countByPeriod, periodStart } from '@/features/habits/streaks';
import { inRange } from '@/features/horizons/periods';
import type { ComparisonRow } from '@/features/time/analytics';
import type { Accent } from '@/lib/accents';
import type { WeekStartsOn } from '@/lib/dates';
import type { Bucket } from './period';

/**
 * Pure aggregation for the Analytics page. Every function takes plain rows
 * whose instants are already yyyy-MM-dd keys in the user's time zone, so the
 * maths is independent of zones and testable without a database.
 */

export type DateRange = { start: string; end: string };

// ───────────────────────── maths and formatting ─────────────────────────

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
/** Rounds and never yields -0. */
const round = (n: number) => Math.round(n) || 0;
const round1 = (n: number) => Math.round(n * 10) / 10 || 0;

/** `part` as a whole percentage of `whole`, or null when there is nothing to compare against. */
export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? round((part / whole) * 100) : null;
}

export function average(values: number[]): number {
  return values.length === 0 ? 0 : round(sum(values) / values.length);
}

/** The progress figures that exist; unmeasured goals do not drag an average down. */
const measured = (rows: Array<{ progress: number | null }>): number[] =>
  rows.map((g) => g.progress).filter((p): p is number => p !== null);

/** Width of a bar as a whole percentage of the largest value, 0–100. */
export function shareOf(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, round((value / max) * 100));
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

/** Minutes as hours with one decimal: "1.5 h", "12 h". */
export function formatHours(minutes: number): string {
  return `${round1(Math.max(0, minutes) / 60)} h`;
}

/** "+1.5 h", "−0.5 h" or "On plan". */
export function formatHoursDelta(minutes: number): string {
  if (round(minutes) === 0) return 'On plan';
  return `${minutes > 0 ? '+' : '−'}${formatHours(Math.abs(minutes))}`;
}

/** "+3", "−2" or "no change". */
export function formatChange(n: number): string {
  if (n === 0) return 'no change';
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

// ───────────────────────── goal completion ─────────────────────────

export type GoalInput = {
  id: string;
  title: string;
  horizon: Horizon;
  status: string;
  /** Null when nothing measures the goal yet; left out of averages. */
  progress: number | null;
  targetDate: string | null;
  /** Local date of the last update; places an achievement in time. */
  updatedKey: string;
  lifeSegmentId: string;
};

export type HorizonRow = {
  horizon: Horizon;
  total: number;
  achieved: number;
  averageProgress: number;
};

export type GoalCompletion = {
  /** Goals with a target date in the period. */
  total: number;
  achieved: number;
  rate: number | null;
  averageProgress: number;
  byHorizon: HorizonRow[];
  /** Goals marked achieved in the period, or achieved with a target date in it. */
  achievedInPeriod: GoalInput[];
  isEmpty: boolean;
};

const isAchieved = (g: GoalInput) => g.status === 'achieved';

export function goalCompletion(goals: GoalInput[], range: DateRange): GoalCompletion {
  const due = goals.filter((g) => inRange(g.targetDate, range.start, range.end));
  const byHorizon = HORIZON_ORDER.map((horizon) => {
    const rows = due.filter((g) => g.horizon === horizon);
    return {
      horizon,
      total: rows.length,
      achieved: rows.filter(isAchieved).length,
      averageProgress: average(measured(rows)),
    };
  }).filter((r) => r.total > 0);
  const achieved = due.filter(isAchieved).length;
  const achievedInPeriod = goals
    .filter(
      (g) =>
        isAchieved(g) &&
        (inRange(g.updatedKey, range.start, range.end) ||
          inRange(g.targetDate, range.start, range.end))
    )
    .sort((a, b) => a.title.localeCompare(b.title));
  return {
    total: due.length,
    achieved,
    rate: ratio(achieved, due.length),
    averageProgress: average(measured(due)),
    byHorizon,
    achievedInPeriod,
    isEmpty: due.length === 0 && achievedInPeriod.length === 0,
  };
}

// ───────────────────────── habit consistency ─────────────────────────

export type HabitInput = {
  id: string;
  name: string;
  frequency: HabitFrequency;
  /** Check-ins expected per frequency period. */
  target: number;
  accent: Accent;
  segmentName: string;
  currentStreak: number;
};

export type CheckInInput = { habitId: string; date: string; value?: number };

export type HabitRow = HabitInput & {
  /** Check-ins recorded inside the period. */
  count: number;
  /** Check-ins that counted towards the target, capped per frequency period. */
  achieved: number;
  /** Target × frequency periods elapsed so far. */
  expected: number;
  rate: number | null;
};

export type HabitConsistency = {
  rows: HabitRow[];
  achieved: number;
  expected: number;
  /** Overall consistency across every habit. */
  rate: number | null;
  isEmpty: boolean;
};

function nextPeriod(start: Date, frequency: HabitFrequency): Date {
  if (frequency === 'weekly') return addWeeks(start, 1);
  if (frequency === 'monthly') return addMonths(start, 1);
  return addDays(start, 1);
}

/**
 * Check-ins against the target over the frequency periods that have started
 * so far (through today, or the whole range once it is over). As on the
 * habits page, over-achieving one period does not make up for another.
 */
export function habitConsistency(
  habits: HabitInput[],
  checkIns: CheckInInput[],
  range: DateRange,
  todayKey: string,
  weekStartsOn: WeekStartsOn
): HabitConsistency {
  const cutoff = todayKey < range.end ? todayKey : range.end;
  const rows: HabitRow[] = habits
    .map((h) => {
      const own = checkIns.filter((c) => c.habitId === h.id);
      const counts = countByPeriod({
        checkIns: own,
        frequency: h.frequency,
        target: h.target,
        todayKey,
        weekStartsOn,
      });
      let achieved = 0;
      let expected = 0;
      if (range.start <= cutoff) {
        const last = parseISO(cutoff);
        for (
          let cursor = periodStart(parseISO(range.start), h.frequency, weekStartsOn);
          cursor <= last;
          cursor = nextPeriod(cursor, h.frequency)
        ) {
          achieved += Math.min(counts.get(format(cursor, 'yyyy-MM-dd')) ?? 0, h.target);
          expected += h.target;
        }
      }
      const count = sum(
        own.filter((c) => inRange(c.date, range.start, range.end)).map((c) => c.value ?? 1)
      );
      return { ...h, count, achieved, expected, rate: ratio(achieved, expected) };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || a.name.localeCompare(b.name));
  const achieved = sum(rows.map((r) => r.achieved));
  const expected = sum(rows.map((r) => r.expected));
  return {
    rows,
    achieved,
    expected,
    rate: ratio(achieved, expected),
    isEmpty: habits.length === 0,
  };
}

// ───────────────────────── time allocation ─────────────────────────

export type SegmentInfo = { id: string; name: string; accent: Accent };

export type TimeRow = {
  segmentId: string;
  name: string;
  accent: Accent;
  planned: number;
  actual: number;
  /** actual − planned, in minutes. */
  delta: number;
};

export type TimeAllocation = {
  rows: TimeRow[];
  plannedTotal: number;
  actualTotal: number;
  delta: number;
  isEmpty: boolean;
};

/** Planned against logged minutes per segment, most logged first. */
export function timeAllocation(
  bySegment: ComparisonRow[],
  segments: SegmentInfo[]
): TimeAllocation {
  const lookup = new Map(segments.map((s) => [s.id, s]));
  const rows = bySegment
    .filter((r) => r.planned > 0 || r.actual > 0)
    .map((r) => {
      const s = lookup.get(r.key);
      return {
        segmentId: r.key,
        name: s?.name ?? 'Unknown segment',
        accent: s?.accent ?? ('beige' as Accent),
        planned: r.planned,
        actual: r.actual,
        delta: r.actual - r.planned,
      };
    })
    .sort((a, b) => b.actual - a.actual || b.planned - a.planned || a.name.localeCompare(b.name));
  const plannedTotal = sum(rows.map((r) => r.planned));
  const actualTotal = sum(rows.map((r) => r.actual));
  return {
    rows,
    plannedTotal,
    actualTotal,
    delta: actualTotal - plannedTotal,
    isEmpty: rows.length === 0,
  };
}

// ───────────────────────── projects and milestones ─────────────────────────

export type ProjectInput = {
  id: string;
  title: string;
  status: string;
  progress: number;
  accent: Accent;
  segmentName: string;
  dueDate: string | null;
};

export type MilestoneInput = {
  id: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  /** The goal or project the milestone belongs to. */
  parentTitle: string | null;
  href: string | null;
};

export type ProjectsAndMilestones = {
  /** Projects that are planned, active or on hold, furthest along first. */
  projects: ProjectInput[];
  milestonesTotal: number;
  milestonesDone: number;
  milestoneRate: number | null;
  /** Milestones due in the period that are past due and not done. */
  overdue: MilestoneInput[];
  isEmpty: boolean;
};

const ACTIVE_PROJECT = new Set(['planned', 'active', 'on_hold']);

export function projectsAndMilestones(
  projects: ProjectInput[],
  milestones: MilestoneInput[],
  todayKey: string
): ProjectsAndMilestones {
  const active = projects
    .filter((p) => ACTIVE_PROJECT.has(p.status))
    .sort((a, b) => b.progress - a.progress || a.title.localeCompare(b.title));
  const done = milestones.filter((m) => m.done).length;
  const overdue = milestones
    .filter((m) => !m.done && m.dueDate !== null && m.dueDate < todayKey)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  return {
    projects: active,
    milestonesTotal: milestones.length,
    milestonesDone: done,
    milestoneRate: ratio(done, milestones.length),
    overdue,
    isEmpty: active.length === 0 && milestones.length === 0,
  };
}

// ───────────────────────── mood and energy ─────────────────────────

export type MoodInput = { date: string; mood: number; energy: number };

export type MoodBucket = Bucket & {
  /** Average on the 1–5 scale, one decimal; null without entries. */
  mood: number | null;
  energy: number | null;
  entries: number;
};

export type MoodTrend = {
  entries: number;
  averageMood: number | null;
  averageEnergy: number | null;
  buckets: MoodBucket[];
  /** The bucket with the highest average mood, labelled on the chart. */
  peakKey: string | null;
  isEmpty: boolean;
};

const mean1 = (values: number[]) => (values.length ? round1(sum(values) / values.length) : null);

export function moodTrend(entries: MoodInput[], buckets: Bucket[]): MoodTrend {
  const cols: MoodBucket[] = buckets.map((b) => {
    const own = entries.filter((e) => inRange(e.date, b.start, b.end));
    return {
      ...b,
      entries: own.length,
      mood: mean1(own.map((e) => e.mood)),
      energy: mean1(own.map((e) => e.energy)),
    };
  });
  const peak = cols.reduce<MoodBucket | null>(
    (best, c) => (c.mood !== null && (!best || c.mood > (best.mood ?? 0)) ? c : best),
    null
  );
  return {
    entries: entries.length,
    averageMood: mean1(entries.map((e) => e.mood)),
    averageEnergy: mean1(entries.map((e) => e.energy)),
    buckets: cols,
    peakKey: peak?.key ?? null,
    isEmpty: entries.length === 0,
  };
}

// ───────────────────────── summary ─────────────────────────

/** Local date keys of each thing that happened, for the current and previous period together. */
export type ActivityKeys = {
  tasksDone: string[];
  events: string[];
  journalEntries: string[];
  reviewsCompleted: string[];
};

export type SummaryMeasure = keyof ActivityKeys;
export type SummaryCounts = Record<SummaryMeasure, number>;

export const SUMMARY_MEASURES: SummaryMeasure[] = [
  'tasksDone',
  'events',
  'journalEntries',
  'reviewsCompleted',
];

export const SUMMARY_LABELS: Record<SummaryMeasure, string> = {
  tasksDone: 'Tasks done',
  events: 'Events held',
  journalEntries: 'Journal entries',
  reviewsCompleted: 'Reviews completed',
};

export type Summary = {
  current: SummaryCounts;
  previous: SummaryCounts;
  /** current − previous. */
  change: SummaryCounts;
};

export function countInRange(keys: string[], range: DateRange): number {
  return keys.filter((k) => inRange(k, range.start, range.end)).length;
}

export function summarise(keys: ActivityKeys, current: DateRange, previous: DateRange): Summary {
  const count = (range: DateRange) =>
    Object.fromEntries(
      SUMMARY_MEASURES.map((m) => [m, countInRange(keys[m], range)])
    ) as SummaryCounts;
  const cur = count(current);
  const prev = count(previous);
  return {
    current: cur,
    previous: prev,
    change: Object.fromEntries(SUMMARY_MEASURES.map((m) => [m, cur[m] - prev[m]])) as SummaryCounts,
  };
}

// ───────────────────────── life balance ─────────────────────────

export type BalanceSegment = { id: string; name: string; accent: Accent; weight: number };

export type BalanceRow = {
  segmentId: string;
  name: string;
  accent: Accent;
  weight: number;
  /** The segment's weight as a percentage of all weights. */
  weightShare: number;
  tasks: number;
  minutes: number;
  goals: number;
  /** Percentages of the totals; null when a measure has no data at all. */
  taskShare: number | null;
  timeShare: number | null;
  goalShare: number | null;
  /** Mean of the shares that have data: what the segment actually receives. */
  attentionShare: number | null;
  /** attentionShare − weightShare in points; positive means more than its weight asks for. */
  gap: number | null;
};

export type LifeBalance = {
  rows: BalanceRow[];
  totals: { tasks: number; minutes: number; goals: number };
  /** One sentence on the widest gap between weight and attention. */
  note: string | null;
  isEmpty: boolean;
};

const GAP_THRESHOLD = 5;

/**
 * Share of open tasks, logged time and goals per segment against its
 * normalised weight. Shares are rounded for display; the note is picked on
 * the unrounded gaps.
 */
export function lifeBalance(
  segments: BalanceSegment[],
  tasksBySegment: Record<string, number>,
  minutesBySegment: Record<string, number>,
  goalsBySegment: Record<string, number>
): LifeBalance {
  const weightTotal = sum(segments.map((s) => Math.max(0, s.weight)));
  const totals = {
    tasks: sum(segments.map((s) => tasksBySegment[s.id] ?? 0)),
    minutes: sum(segments.map((s) => minutesBySegment[s.id] ?? 0)),
    goals: sum(segments.map((s) => goalsBySegment[s.id] ?? 0)),
  };
  const share = (value: number, total: number) => (total > 0 ? (value / total) * 100 : null);
  const raw = segments.map((s) => {
    const tasks = tasksBySegment[s.id] ?? 0;
    const minutes = minutesBySegment[s.id] ?? 0;
    const goals = goalsBySegment[s.id] ?? 0;
    const weightShare =
      weightTotal > 0 ? (Math.max(0, s.weight) / weightTotal) * 100 : 100 / segments.length;
    const shares = [
      share(tasks, totals.tasks),
      share(minutes, totals.minutes),
      share(goals, totals.goals),
    ];
    const present = shares.filter((x): x is number => x !== null);
    const attention = present.length ? sum(present) / present.length : null;
    return {
      segmentId: s.id,
      name: s.name,
      accent: s.accent,
      weight: s.weight,
      weightShare,
      tasks,
      minutes,
      goals,
      taskShare: shares[0],
      timeShare: shares[1],
      goalShare: shares[2],
      attentionShare: attention,
      gap: attention === null ? null : attention - weightShare,
    };
  });
  const roundOrNull = (n: number | null) => (n === null ? null : round(n));
  const rows: BalanceRow[] = raw.map((r) => ({
    ...r,
    weightShare: round(r.weightShare),
    taskShare: roundOrNull(r.taskShare),
    timeShare: roundOrNull(r.timeShare),
    goalShare: roundOrNull(r.goalShare),
    attentionShare: roundOrNull(r.attentionShare),
    gap: roundOrNull(r.gap),
  }));
  const isEmpty =
    segments.length === 0 || (totals.tasks === 0 && totals.minutes === 0 && totals.goals === 0);
  let note: string | null = null;
  if (!isEmpty) {
    const widest = raw
      .filter((r) => r.gap !== null)
      .sort((a, b) => Math.abs(b.gap ?? 0) - Math.abs(a.gap ?? 0))[0];
    if (widest && widest.gap !== null && Math.abs(widest.gap) >= GAP_THRESHOLD) {
      note = `Widest gap: ${widest.name} receives ${round(widest.attentionShare ?? 0)}% of your attention (open tasks, logged time and goals) against a weight share of ${round(widest.weightShare)}%.`;
    } else {
      note = 'Your attention is spread close to the weights you gave each segment.';
    }
  }
  return { rows, totals, note, isEmpty };
}
