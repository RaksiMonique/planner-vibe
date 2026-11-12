/**
 * Task dependencies: a task can wait on other tasks ("blocked by"). A task is
 * blocked while any task it waits on is still open. Nothing here touches the
 * database, so it is unit tested on its own.
 */

export type DependencyEdge = { taskId: string; dependsOnTaskId: string };
export type Blocker = { id: string; title: string };

/**
 * Which of `blockerIds` would make `taskId` wait on itself, directly or
 * through other tasks. Edges from `taskId` itself are ignored, because the
 * caller is about to replace them with `blockerIds`.
 */
export function findCycles(
  taskId: string,
  blockerIds: readonly string[],
  edges: readonly DependencyEdge[]
): string[] {
  const dependsOn = new Map<string, string[]>();
  for (const e of edges) {
    if (e.taskId === taskId) continue;
    const list = dependsOn.get(e.taskId) ?? [];
    list.push(e.dependsOnTaskId);
    dependsOn.set(e.taskId, list);
  }
  const reachesTask = (from: string): boolean => {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === taskId) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      for (const next of dependsOn.get(current) ?? []) stack.push(next);
    }
    return false;
  };
  return [...new Set(blockerIds)].filter((b) => reachesTask(b));
}

/** "Blocked by Buy paint", or "Blocked by Buy paint and 2 more". */
export function blockedLabel(blockedBy: readonly Blocker[]): string {
  if (blockedBy.length === 0) return '';
  const [first, ...rest] = blockedBy;
  if (rest.length === 0) return `Blocked by ${first.title}`;
  return `Blocked by ${first.title} and ${rest.length} more`;
}
