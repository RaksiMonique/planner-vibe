/**
 * Goal progress, computed on read (instructions.md 5.5). Precedence:
 * achieved → 100; measurable target → current/target; children → average;
 * milestones → done/total; otherwise the manually stored percentage.
 */
export function computeGoalProgress(
  goal: {
    status: string;
    targetValue: string | number | null;
    currentValue: string | number | null;
    progress: number;
  },
  childProgresses: number[],
  milestones: { total: number; done: number }
): number {
  if (goal.status === 'achieved') return 100;
  const target = goal.targetValue === null ? 0 : Number(goal.targetValue);
  if (target > 0) {
    const current = goal.currentValue === null ? 0 : Number(goal.currentValue);
    return clamp(Math.round((current / target) * 100));
  }
  if (childProgresses.length > 0) {
    return clamp(Math.round(childProgresses.reduce((a, b) => a + b, 0) / childProgresses.length));
  }
  if (milestones.total > 0) return clamp(Math.round((milestones.done / milestones.total) * 100));
  return clamp(goal.progress);
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export const HORIZON_ORDER = ['lifelong', 'annual', 'quarterly', 'monthly', 'weekly'] as const;
export type Horizon = (typeof HORIZON_ORDER)[number];

/** A child goal must sit at a shorter horizon than its parent. */
export function canBeChildOf(child: Horizon, parent: Horizon): boolean {
  return HORIZON_ORDER.indexOf(child) > HORIZON_ORDER.indexOf(parent);
}
