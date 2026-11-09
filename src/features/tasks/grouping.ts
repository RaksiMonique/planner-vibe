import { dueStatus, type DueStatus, type WeekStartsOn } from '@/lib/dates';

type Groupable = { dueDate: string | null; isImportant: boolean; status: string };

export type ListGroupKey = DueStatus;
export const LIST_GROUPS: Array<{ key: ListGroupKey; label: string }> = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This week' },
  { key: 'later', label: 'Later' },
  { key: 'none', label: 'No date' },
];

export function groupForList<T extends Groupable>(
  tasks: T[],
  today: Date,
  weekStartsOn: WeekStartsOn
): Record<ListGroupKey, T[]> {
  const groups: Record<ListGroupKey, T[]> = {
    overdue: [],
    today: [],
    this_week: [],
    later: [],
    none: [],
  };
  for (const t of tasks) groups[dueStatus(t.dueDate, today, weekStartsOn)].push(t);
  return groups;
}

export type Quadrant = 'do' | 'schedule' | 'delegate' | 'eliminate';
export const QUADRANTS: Array<{ key: Quadrant; label: string; hint: string }> = [
  { key: 'do', label: 'Do first', hint: 'Urgent and important' },
  { key: 'schedule', label: 'Schedule', hint: 'Important, not urgent' },
  { key: 'delegate', label: 'Delegate', hint: 'Urgent, not important' },
  { key: 'eliminate', label: 'Eliminate', hint: 'Neither' },
];

/** Urgent means due today or overdue; importance is the task's own flag. */
export function quadrantOf(task: Groupable, today: Date, weekStartsOn: WeekStartsOn): Quadrant {
  const status = dueStatus(task.dueDate, today, weekStartsOn);
  const urgent = status === 'overdue' || status === 'today';
  if (urgent && task.isImportant) return 'do';
  if (task.isImportant) return 'schedule';
  if (urgent) return 'delegate';
  return 'eliminate';
}

export function groupForMatrix<T extends Groupable>(
  tasks: T[],
  today: Date,
  weekStartsOn: WeekStartsOn
): Record<Quadrant, T[]> {
  const groups: Record<Quadrant, T[]> = { do: [], schedule: [], delegate: [], eliminate: [] };
  for (const t of tasks) groups[quadrantOf(t, today, weekStartsOn)].push(t);
  return groups;
}

export type BoardColumn = 'todo' | 'in_progress' | 'done';
export const BOARD_COLUMNS: Array<{ key: BoardColumn; label: string }> = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export function groupForBoard<T extends Groupable>(tasks: T[]): Record<BoardColumn, T[]> {
  const groups: Record<BoardColumn, T[]> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) {
    const key = (t.status in groups ? t.status : 'todo') as BoardColumn;
    groups[key].push(t);
  }
  return groups;
}
