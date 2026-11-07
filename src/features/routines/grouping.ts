import { parseISO } from 'date-fns';
import { ROUTINE_KINDS, type RoutineKind } from './schema';

/** Groups in the fixed kind order, dropping empty groups. */
export function groupRoutinesByKind<T extends { kind: RoutineKind }>(
  routines: T[]
): Array<{ kind: RoutineKind; routines: T[] }> {
  return ROUTINE_KINDS.map((kind) => ({
    kind,
    routines: routines.filter((r) => r.kind === kind),
  })).filter((g) => g.routines.length > 0);
}

export function isScheduledOn(daysOfWeek: number[], dateKey: string): boolean {
  return daysOfWeek.includes(parseISO(dateKey).getDay());
}

/** Progress counts only steps that still exist, so deleted steps never block completion. */
export function routineProgress(
  stepIds: string[],
  completedStepIds: string[]
): { done: number; total: number; percent: number; complete: boolean } {
  const completed = new Set(completedStepIds);
  const done = stepIds.filter((id) => completed.has(id)).length;
  const total = stepIds.length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && done === total,
  };
}

export type HistoryStatus = 'done' | 'partial' | 'missed' | 'unscheduled';

export function historyStatus(
  completion: { completedStepIds: string[]; completedAt: Date | null } | undefined,
  scheduled: boolean
): HistoryStatus {
  if (completion?.completedAt) return 'done';
  if (completion && completion.completedStepIds.length > 0) return 'partial';
  return scheduled ? 'missed' : 'unscheduled';
}
