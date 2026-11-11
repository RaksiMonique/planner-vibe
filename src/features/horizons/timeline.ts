import { addMonths, format, parseISO } from 'date-fns';
import type { Horizon } from '@/features/goals/progress';
import { HORIZON_ORDER } from '@/features/goals/progress';

/** The fields the goal timeline needs; GoalRow satisfies it. */
export type TimelineGoal = {
  id: string;
  title: string;
  horizon: Horizon;
  targetDate: string | null;
  progress: number;
  status: string;
  parentGoalId: string | null;
};

export type TimelineWindow = {
  /** One column per month, or per year when the span is long. */
  unit: 'month' | 'year';
  /** 'yyyy-MM' or 'yyyy' keys. */
  columns: string[];
  todayColumn: number;
};

const MAX_MONTH_COLUMNS = 36;

/**
 * A window that always contains today and the coming year, widened to the
 * earliest and latest target dates. Beyond three years it switches to one
 * column per year so lifelong goals stay readable.
 */
export function timelineWindow(goals: TimelineGoal[], todayKey: string): TimelineWindow {
  const today = parseISO(`${todayKey.slice(0, 7)}-01`);
  let first = today;
  let last = addMonths(today, 11);
  for (const g of goals) {
    if (!g.targetDate) continue;
    const d = parseISO(`${g.targetDate.slice(0, 7)}-01`);
    if (d < first) first = d;
    if (d > last) last = d;
  }
  const spanMonths =
    (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()) + 1;
  if (spanMonths <= MAX_MONTH_COLUMNS) {
    const columns = Array.from({ length: spanMonths }, (_, i) =>
      format(addMonths(first, i), 'yyyy-MM')
    );
    return { unit: 'month', columns, todayColumn: columns.indexOf(format(today, 'yyyy-MM')) };
  }
  const years: string[] = [];
  for (let y = first.getFullYear(); y <= last.getFullYear(); y++) years.push(String(y));
  return { unit: 'year', columns: years, todayColumn: years.indexOf(String(today.getFullYear())) };
}

export function columnOf(window: TimelineWindow, dateKey: string | null): number | null {
  if (!dateKey) return null;
  const key = window.unit === 'month' ? dateKey.slice(0, 7) : dateKey.slice(0, 4);
  const i = window.columns.indexOf(key);
  return i === -1 ? null : i;
}

export type TimelineLane<T extends TimelineGoal> = {
  horizon: Horizon;
  placed: Array<{ goal: T; column: number }>;
  undated: T[];
};

/** One lane per horizon, longest first, each goal in the column of its target date. */
export function buildLanes<T extends TimelineGoal>(
  goals: T[],
  window: TimelineWindow
): TimelineLane<T>[] {
  return HORIZON_ORDER.map((horizon) => {
    const lane: TimelineLane<T> = { horizon, placed: [], undated: [] };
    for (const goal of goals.filter((g) => g.horizon === horizon)) {
      const column = columnOf(window, goal.targetDate);
      if (column === null) lane.undated.push(goal);
      else lane.placed.push({ goal, column });
    }
    lane.placed.sort((a, b) => a.column - b.column || a.goal.title.localeCompare(b.goal.title));
    return lane;
  });
}

/** The goal plus every descendant, breadth first. */
export function collectSubtree<T extends { id: string; parentGoalId: string | null }>(
  rootId: string,
  all: T[]
): T[] {
  const byParent = new Map<string, T[]>();
  for (const g of all) {
    if (!g.parentGoalId) continue;
    const list = byParent.get(g.parentGoalId) ?? [];
    list.push(g);
    byParent.set(g.parentGoalId, list);
  }
  const root = all.find((g) => g.id === rootId);
  if (!root) return [];
  const out: T[] = [root];
  const queue = [rootId];
  const seen = new Set([rootId]);
  while (queue.length) {
    const id = queue.shift()!;
    for (const child of byParent.get(id) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child);
      queue.push(child.id);
    }
  }
  return out;
}
