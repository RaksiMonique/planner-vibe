import type { Metadata } from 'next';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { PageHeader } from '@/components/shared/page-header';
import { listGoalOptions, listMilestones } from '@/features/goals/queries';
import { listSegmentsByUsage } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { TaskSheet } from '@/features/tasks/components/task-sheet';
import {
  TaskBoardView,
  TaskListView,
  TaskMatrixView,
} from '@/features/tasks/components/task-views';
import { TasksToolbar } from '@/features/tasks/components/tasks-toolbar';
import { countOpenSubtasks, getTask, listTasks } from '@/features/tasks/queries';
import { requireUser } from '@/lib/auth';
import { todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Tasks' };
export const dynamic = 'force-dynamic';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = ['list', 'board', 'matrix'].includes(one(sp.view) ?? '') ? one(sp.view)! : 'list';
  const includeDone = one(sp.done) === '1';
  const taskId = one(sp.task);
  const parentId = one(sp.parent);
  const isNew = one(sp.new) === '1';

  const [prefs, segments, projects, goals] = await Promise.all([
    getPreferences(user.id),
    listSegmentsByUsage(user.id),
    listProjectOptions(user.id),
    listGoalOptions(user.id),
  ]);
  const segment = segments.find((s) => s.slug === one(sp.segment));
  const today = todayInZone(prefs.timeZone);

  const [tasks, subtaskCounts, editing, parentTask, milestones] = await Promise.all([
    listTasks(user.id, {
      lifeSegmentId: segment?.id,
      projectId: one(sp.project),
      goalId: one(sp.goal),
      status: includeDone ? 'all' : 'open',
      parentTaskId: null,
    }),
    countOpenSubtasks(user.id),
    taskId ? getTask(user.id, taskId) : Promise.resolve(null),
    parentId ? getTask(user.id, parentId) : Promise.resolve(null),
    taskId || isNew ? listMilestones(user.id, { open: true }) : Promise.resolve([]),
  ]);
  const subtasks = editing
    ? await listTasks(user.id, { parentTaskId: editing.id, status: 'all' })
    : [];

  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = one(v);
    if (val && !['new', 'task', 'parent'].includes(k)) base.set(k, val);
  }
  const editHref = (id: string) => {
    const p = new URLSearchParams(base);
    p.set('task', id);
    return `/tasks?${p.toString()}`;
  };

  const viewProps = { tasks, today, weekStartsOn: prefs.weekStartsOn, subtaskCounts, editHref };
  const dueTime = editing?.dueAt ? format(toZonedTime(editing.dueAt, prefs.timeZone), 'HH:mm') : '';

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Everything actionable, grouped by when it is due. Mark what is important and the matrix sorts itself."
      />
      <TasksToolbar view={view} segments={segments} projects={projects} goals={goals} />
      {view === 'board' && <TaskBoardView {...viewProps} />}
      {view === 'matrix' && <TaskMatrixView {...viewProps} />}
      {view === 'list' && <TaskListView {...viewProps} />}
      {(isNew || editing) && (
        <TaskSheet
          key={editing?.id ?? `new-${parentId ?? ''}`}
          task={editing}
          subtasks={subtasks}
          parentTask={parentTask ? { id: parentTask.id, title: parentTask.title } : null}
          segments={segments}
          projects={projects}
          goals={goals}
          milestones={milestones}
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
