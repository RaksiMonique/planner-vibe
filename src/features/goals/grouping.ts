import { HORIZON_ORDER, type Horizon } from './progress';

/** Goals grouped in horizon order, empty horizons left out. */
export function groupGoalsByHorizon<T extends { horizon: Horizon }>(
  goals: T[]
): Array<{ horizon: Horizon; goals: T[] }> {
  return HORIZON_ORDER.map((horizon) => ({
    horizon,
    goals: goals.filter((g) => g.horizon === horizon),
  })).filter((group) => group.goals.length > 0);
}

/** Ancestors of a goal from the root down to its direct parent. Cycle-safe. */
export function buildAncestorChain<T extends { id: string; parentGoalId: string | null }>(
  goalId: string,
  all: T[]
): T[] {
  const byId = new Map(all.map((g) => [g.id, g]));
  const chain: T[] = [];
  const seen = new Set<string>([goalId]);
  let current = byId.get(goalId)?.parentGoalId ?? null;
  while (current && !seen.has(current)) {
    const goal = byId.get(current);
    if (!goal) break;
    chain.unshift(goal);
    seen.add(current);
    current = goal.parentGoalId;
  }
  return chain;
}
