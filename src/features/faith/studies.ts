import type { StudyStatus } from './schema';

/**
 * Which study to put in front of the reader. Finishing what is open comes
 * before starting something new, so an in-progress study wins; only when
 * nothing is open does the next unstarted study whose prerequisite is done
 * get suggested. Nothing here touches the database.
 */

type StudyLike = {
  id: string;
  status: StudyStatus;
  priority: 'high' | 'medium' | 'low';
  prerequisiteId: string | null;
  updatedAt: Date;
};

export type NextStudy<T> = { study: T; mode: 'continue' | 'start' };

const RANK = { high: 0, medium: 1, low: 2 } as const;

/** Studies by priority, then most recently touched first. */
const byPriorityThenRecent = <T extends StudyLike>(a: T, b: T) =>
  RANK[a.priority] - RANK[b.priority] || b.updatedAt.getTime() - a.updatedAt.getTime();

export function nextStudy<T extends StudyLike>(studies: T[]): NextStudy<T> | undefined {
  const open = studies.filter((s) => s.status === 'in_progress').sort(byPriorityThenRecent);
  if (open[0]) return { study: open[0], mode: 'continue' };
  const byId = new Map(studies.map((s) => [s.id, s]));
  const ready = studies
    .filter((s) => s.status === 'not_started')
    .filter((s) => !s.prerequisiteId || byId.get(s.prerequisiteId)?.status === 'done')
    .sort(byPriorityThenRecent);
  return ready[0] ? { study: ready[0], mode: 'start' } : undefined;
}

/** The shelf order: what is open first, then what waits, then what is done. */
export const STUDY_SHELF_ORDER: StudyStatus[] = ['in_progress', 'not_started', 'done'];
