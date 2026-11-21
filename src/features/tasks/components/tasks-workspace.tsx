import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { PageHeader } from '@/components/shared/page-header';
import { listGoalOptions, listMilestones } from '@/features/goals/queries';
import type { LifeSegment } from '@/features/life-segments/service';
import { listSegmentsByUsage } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { todayInZone } from '@/lib/dates';
import {
  countOpenSubtasks,
  type TaskRow as TaskRowData,
  getTask,
  listBlockerOptions,
  listDependencyIds,
  listTasks,
} from '../queries';
import { TaskSheet } from './task-sheet';
import { TaskBoardView, TaskListView, TaskMatrixView } from './task-views';
import { TasksToolbar } from './tasks-toolbar';

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The tasks page body: toolbar, the chosen view and the task sheet. The
 * Tasks page shows everything; the Work section mounts it at its own path
 * locked to the work segment.
 */
export async function TasksWorkspace({
  userId,
  searchParams: sp,
  basePath,
  lockedSegment,
  title,
  description,
  actions,
}: {
  userId: string;
  searchParams: SearchParams;
  /** Where this workspace lives, for edit links. */
  basePath: '/tasks' | '/work/tasks';
  /** When set, only this segment's tasks show and new ones start in it. */
  lockedSegment?: LifeSegment;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  const view = ['list', 'board', 'matrix'].includes(one(sp.view) ?? '') ? one(sp.view)! : 'list';
  const includeDone = one(sp.done) === '1';
  const taskId = one(sp.task);
  const parentId = one(sp.parent);
  const isNew = one(sp.new) === '1' || one(sp.new) === 'task';
  const blocked = one(sp.blocked);
  const due = one(sp.due);

  const [prefs, segments, allProjects, goals] = await Promise.all([
    getPreferences(userId),
    listSegmentsByUsage(userId),
    listProjectOptions(userId),
    listGoalOptions(userId),
  ]);
  const segment = lockedSegment ?? segments.find((s) => s.slug === one(sp.segment));
  const projects = lockedSegment
    ? allProjects.filter((p) => p.lifeSegmentId === lockedSegment.id)
    : allProjects;
  const today = todayInZone(prefs.timeZone);

  const [
    allTasks,
    allSubtasks,
    subtaskCounts,
    editing,
    parentTask,
    milestones,
    blockerOptions,
    blockedByIds,
  ] = await Promise.all([
    listTasks(userId, {
      lifeSegmentId: segment?.id,
      projectId: one(sp.project),
      goalId: one(sp.goal),
      status: includeDone ? 'all' : 'open',
      parentTaskId: null,
    }),
    // Shown indented under their parents, following the same done filter.
    listTasks(userId, { status: includeDone ? 'all' : 'open', parentTaskId: 'any' }),
    countOpenSubtasks(userId),
    taskId ? getTask(userId, taskId) : Promise.resolve(null),
    parentId ? getTask(userId, parentId) : Promise.resolve(null),
    taskId || isNew ? listMilestones(userId, { open: true }) : Promise.resolve([]),
    taskId || isNew ? listBlockerOptions(userId, taskId) : Promise.resolve([]),
    taskId ? listDependencyIds(userId, taskId) : Promise.resolve([]),
  ]);
  const byBlocking =
    blocked === 'hide'
      ? allTasks.filter((t) => t.blockedBy.length === 0)
      : blocked === 'only'
        ? allTasks.filter((t) => t.blockedBy.length > 0)
        : allTasks;
  const tasks =
    due === 'none'
      ? byBlocking.filter((t) => !t.dueDate)
      : due === 'dated'
        ? byBlocking.filter((t) => Boolean(t.dueDate))
        : byBlocking;
  const subtasksOf: Record<string, TaskRowData[]> = {};
  for (const s of allSubtasks) {
    if (!s.parentTaskId) continue;
    (subtasksOf[s.parentTaskId] ??= []).push(s);
  }
  const [subtasks, ownParent] = await Promise.all([
    editing ? listTasks(userId, { parentTaskId: editing.id, status: 'all' }) : [],
    // An existing subtask's sheet names its parent and returns to it.
    editing?.parentTaskId && !parentTask ? getTask(userId, editing.parentTaskId) : null,
  ]);
  const parentOf = parentTask ?? ownParent;

  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = one(v);
    if (val && !['new', 'task', 'parent'].includes(k)) base.set(k, val);
  }
  const editHref = (id: string) => {
    const p = new URLSearchParams(base);
    p.set('task', id);
    return `${basePath}?${p.toString()}`;
  };

  const viewProps = {
    tasks,
    today,
    weekStartsOn: prefs.weekStartsOn,
    subtaskCounts,
    subtasksOf,
    editHref,
  };
  const dueTime = editing?.dueAt ? format(toZonedTime(editing.dueAt, prefs.timeZone), 'HH:mm') : '';

  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />
      <TasksToolbar
        view={view}
        segments={segments}
        projects={projects}
        goals={goals}
        lockSegment={Boolean(lockedSegment)}
      />
      {view === 'board' && <TaskBoardView {...viewProps} />}
      {view === 'matrix' && <TaskMatrixView {...viewProps} />}
      {view === 'list' && <TaskListView {...viewProps} />}
      {(isNew || editing) && (
        <TaskSheet
          key={editing?.id ?? `new-${parentId ?? ''}`}
          task={editing}
          subtasks={subtasks}
          parentTask={parentOf ? { id: parentOf.id, title: parentOf.title } : null}
          segments={segments}
          projects={projects}
          goals={goals}
          milestones={milestones}
          blockerOptions={blockerOptions}
          blockedByIds={blockedByIds}
          defaults={{
            lifeSegmentId: segment?.id ?? parentTask?.lifeSegmentId,
            projectId: one(sp.project) ?? parentTask?.projectId ?? undefined,
          }}
          dueTime={dueTime}
        />
      )}
    </div>
  );
}
