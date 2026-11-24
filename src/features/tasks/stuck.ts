import { differenceInCalendarDays, parseISO } from 'date-fns';

/** How many days past due, or how long untouched, before a task counts as stuck. */
export const STUCK_OVERDUE_DAYS = 3;
export const STUCK_AGE_DAYS = 14;
export const STUCK_IDLE_DAYS = 7;

export type StuckCheck = {
  status: string;
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A task that keeps rolling over: open, and either three or more days past
 * its due date, or undated, a fortnight old and untouched for a week. Writing
 * out what is in the way usually loosens it (task-sheet.tsx, "Write it out").
 */
export function isStuck(task: StuckCheck, todayKey: string): boolean {
  if (task.status === 'done') return false;
  const today = parseISO(todayKey);
  if (task.dueDate) {
    return differenceInCalendarDays(today, parseISO(task.dueDate)) >= STUCK_OVERDUE_DAYS;
  }
  return (
    differenceInCalendarDays(today, task.createdAt) >= STUCK_AGE_DAYS &&
    differenceInCalendarDays(today, task.updatedAt) >= STUCK_IDLE_DAYS
  );
}
