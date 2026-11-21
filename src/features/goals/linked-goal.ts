import { HORIZON_ORDER, type Horizon } from './progress';

export type GoalCandidate = { id: string; horizon: Horizon };

/**
 * The goal a task inherits from its project when the user picks none
 * (instructions.md 5.3): none when the project supports no goal, that goal
 * when it supports one, and the goal at the longest horizon when it supports
 * several, the first listed on a tie.
 */
export function pickLinkedGoal<T extends GoalCandidate>(candidates: T[]): T | null {
  let best: T | null = null;
  for (const c of candidates) {
    if (!best || HORIZON_ORDER.indexOf(c.horizon) < HORIZON_ORDER.indexOf(best.horizon)) best = c;
  }
  return best;
}

/** `pickLinkedGoal` over the picker options the task sheet already holds. */
export function goalForProject<T extends GoalCandidate>(
  projectId: string,
  projects: Array<{ id: string; goalIds?: string[] }>,
  goals: T[]
): T | null {
  const ids = projects.find((p) => p.id === projectId)?.goalIds ?? [];
  return pickLinkedGoal(goals.filter((g) => ids.includes(g.id)));
}
