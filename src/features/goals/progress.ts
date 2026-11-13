export const NOT_MEASURED = 'Not measured yet';

/** "42%", or the not-measured wording when there is nothing to measure. */
export function progressText(progress: number | null): string {
  return progress === null ? NOT_MEASURED : `${progress}%`;
}

/**
 * Goal progress, computed on read (instructions.md 5.5). Precedence:
 * achieved → 100; measurable target → current/target; measured children →
 * their average; milestones → done/total; a stored percentage above zero;
 * otherwise null: nothing measures this goal yet, so no number is shown
 * rather than a misleading 0%.
 */
export function computeGoalProgress(
  goal: {
    status: string;
    targetValue: string | number | null;
    currentValue: string | number | null;
    progress: number;
  },
  childProgresses: Array<number | null>,
  milestones: { total: number; done: number }
): number | null {
  if (goal.status === 'achieved') return 100;
  const target = goal.targetValue === null ? 0 : Number(goal.targetValue);
  if (target > 0) {
    const current = goal.currentValue === null ? 0 : Number(goal.currentValue);
    return clamp(Math.round((current / target) * 100));
  }
  const measured = childProgresses.filter((p): p is number => p !== null);
  if (measured.length > 0) {
    return clamp(Math.round(measured.reduce((a, b) => a + b, 0) / measured.length));
  }
  if (milestones.total > 0) return clamp(Math.round((milestones.done / milestones.total) * 100));
  return goal.progress > 0 ? clamp(goal.progress) : null;
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
