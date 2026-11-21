import 'server-only';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { listGoalOptions, listMilestones } from '@/features/goals/queries';
import { listSegmentsByUsage } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import type { TaskSheetProps } from './components/task-sheet';
import { getTask, listBlockerOptions, listDependencyIds, listTasks } from './queries';

/**
 * Everything the task sheet needs, so it can open as an overlay on any page
 * (`?task=<id>` to edit, `?new=task` to add) without leaving that page.
 */
export async function loadTaskSheetData(
  userId: string,
  opts: { taskId?: string; parentId?: string; projectId?: string; lifeSegmentId?: string }
): Promise<TaskSheetProps> {
  const [prefs, segments, projects, goals, task, parentTask, milestones, blockerOptions] =
    await Promise.all([
      getPreferences(userId),
      listSegmentsByUsage(userId),
      listProjectOptions(userId),
      listGoalOptions(userId),
      opts.taskId ? getTask(userId, opts.taskId) : Promise.resolve(null),
      opts.parentId ? getTask(userId, opts.parentId) : Promise.resolve(null),
      listMilestones(userId, { open: true }),
      listBlockerOptions(userId, opts.taskId),
    ]);
  const [subtasks, blockedByIds] = await Promise.all([
    task ? listTasks(userId, { parentTaskId: task.id, status: 'all' }) : Promise.resolve([]),
    task ? listDependencyIds(userId, task.id) : Promise.resolve([]),
  ]);
  return {
    task,
    subtasks,
    parentTask: parentTask ? { id: parentTask.id, title: parentTask.title } : null,
    segments,
    projects,
    goals,
    milestones,
    blockerOptions,
    blockedByIds,
    defaults: {
      lifeSegmentId: opts.lifeSegmentId ?? parentTask?.lifeSegmentId,
      projectId: opts.projectId ?? parentTask?.projectId ?? undefined,
    },
    dueTime: task?.dueAt ? format(toZonedTime(task.dueAt, prefs.timeZone), 'HH:mm') : '',
  };
}
