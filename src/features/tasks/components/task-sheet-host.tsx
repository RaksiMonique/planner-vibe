'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadTaskSheetAction } from '../actions';
import { TaskSheet, type TaskSheetProps } from './task-sheet';

/** Pages that render the task sheet themselves. */
const OWN_SHEET = ['/tasks', '/work/tasks'];

/**
 * Opens the task sheet over whatever page is showing: `?task=<id>` edits,
 * `?new=task` adds (with `parent=` or `project=` as defaults). The sheet
 * clears those parameters when it closes, so the page stays where it was.
 */
export function TaskSheetHost() {
  const pathname = usePathname();
  const params = useSearchParams();
  const taskId = params.get('task') ?? undefined;
  const isNew = params.get('new') === 'task';
  const parentId = params.get('parent') ?? undefined;
  const projectId = params.get('project') ?? undefined;
  const active = !OWN_SHEET.includes(pathname) && (Boolean(taskId) || isNew);
  const key = active ? `${taskId ?? 'new'}:${parentId ?? ''}:${projectId ?? ''}` : '';
  const [loaded, setLoaded] = useState<{ key: string; props: TaskSheetProps } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void loadTaskSheetAction({ taskId, parentId, projectId }).then((result) => {
      if (!cancelled && result.ok) setLoaded({ key, props: result.data });
    });
    return () => {
      cancelled = true;
    };
  }, [key, taskId, parentId, projectId]);

  if (!active || !loaded || loaded.key !== key) return null;
  return <TaskSheet key={key} {...loaded.props} />;
}
