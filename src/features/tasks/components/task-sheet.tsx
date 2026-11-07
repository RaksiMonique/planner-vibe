'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import type { GoalOption, Milestone } from '@/features/goals/queries';
import type { LifeSegment } from '@/features/life-segments/service';
import type { ProjectOption } from '@/features/projects/queries';
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
  type TaskFormState,
} from '../actions';
import type { TaskRow } from '../queries';
import { presetFromRrule, RECURRENCE_LABELS, RECURRENCE_PRESETS } from '../recurrence';
import { PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, TASK_STATUSES } from '../schema';
import { NativeSelect } from './native-select';

export type TaskSheetProps = {
  task: TaskRow | null;
  subtasks: TaskRow[];
  parentTask: { id: string; title: string } | null;
  segments: LifeSegment[];
  projects: ProjectOption[];
  goals: GoalOption[];
  milestones: Milestone[];
  defaults: { lifeSegmentId?: string; projectId?: string };
  /** HH:mm of the existing due time in the user's zone, if any. */
  dueTime: string;
};

function fieldErrors(state: TaskFormState, name: string) {
  if (!state || state.ok || !state.fieldErrors?.[name]) return undefined;
  return state.fieldErrors[name]!.map((message) => ({ message }));
}

export function TaskSheet(props: TaskSheetProps) {
  const { task, subtasks, parentTask, segments, projects, goals, milestones, defaults, dueTime } =
    props;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, action] = useActionState(task ? updateTaskAction : createTaskAction, undefined);
  const [deleting, startDelete] = useTransition();
  const [goalId, setGoalId] = useState(task?.goalId ?? '');
  const [projectId, setProjectId] = useState(task?.projectId ?? defaults.projectId ?? '');
  const [segmentId, setSegmentId] = useState(
    task?.lifeSegmentId ?? defaults.lifeSegmentId ?? segments[0]?.id ?? ''
  );

  function close() {
    const next = new URLSearchParams(params.toString());
    for (const k of ['new', 'task', 'parent']) next.delete(k);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (state?.ok) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const visibleMilestones = milestones.filter(
    (m) => (goalId && m.goalId === goalId) || (projectId && m.projectId === projectId)
  );
  const editing = Boolean(task);
  const subtaskParams = new URLSearchParams(params.toString());
  subtaskParams.delete('task');
  subtaskParams.set('new', '1');
  if (task) subtaskParams.set('parent', task.id);

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-heading text-xl">
            {editing ? 'Edit task' : parentTask ? 'New subtask' : 'New task'}
          </SheetTitle>
          <SheetDescription>
            {parentTask ? `Under “${parentTask.title}”` : 'Every task belongs to a Life Segment.'}
          </SheetDescription>
        </SheetHeader>
        <form action={action} className="flex flex-col gap-5 p-4">
          {task && <input type="hidden" name="id" value={task.id} />}
          {(parentTask || task?.parentTaskId) && (
            <input
              type="hidden"
              name="parentTaskId"
              value={parentTask?.id ?? task?.parentTaskId ?? ''}
            />
          )}
          {state && !state.ok && !state.fieldErrors && (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
            >
              {state.error}
            </p>
          )}
          <FieldGroup>
            <Field data-invalid={Boolean(fieldErrors(state, 'title')) || undefined}>
              <FieldLabel htmlFor="task-title">Title</FieldLabel>
              <Input
                id="task-title"
                name="title"
                defaultValue={task?.title ?? ''}
                required
                autoFocus
              />
              <FieldError errors={fieldErrors(state, 'title')} />
            </Field>
            <Field data-invalid={Boolean(fieldErrors(state, 'lifeSegmentId')) || undefined}>
              <FieldLabel htmlFor="task-segment">Life Segment</FieldLabel>
              <NativeSelect
                id="task-segment"
                name="lifeSegmentId"
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                required
              >
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={Boolean(fieldErrors(state, 'dueDate')) || undefined}>
                <FieldLabel htmlFor="task-due">Due date</FieldLabel>
                <Input
                  id="task-due"
                  name="dueDate"
                  type="date"
                  defaultValue={task?.dueDate ?? ''}
                />
                <FieldError errors={fieldErrors(state, 'dueDate')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="task-time">Time</FieldLabel>
                <Input id="task-time" name="dueTime" type="time" defaultValue={dueTime} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
                <NativeSelect
                  id="task-priority"
                  name="priority"
                  defaultValue={task?.priority ?? 'medium'}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="task-status">Status</FieldLabel>
                <NativeSelect id="task-status" name="status" defaultValue={task?.status ?? 'todo'}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="isImportant" defaultChecked={task?.isImportant ?? false} />
              Important (Eisenhower)
            </label>
            <Field>
              <FieldLabel htmlFor="task-recurrence">Repeat</FieldLabel>
              <NativeSelect
                id="task-recurrence"
                name="recurrence"
                defaultValue={presetFromRrule(task?.rrule)}
              >
                {RECURRENCE_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {RECURRENCE_LABELS[p]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="task-project">Project</FieldLabel>
              <NativeSelect
                id="task-project"
                name="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="task-goal">Goal</FieldLabel>
              <NativeSelect
                id="task-goal"
                name="goalId"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.horizon})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {visibleMilestones.length > 0 && (
              <Field>
                <FieldLabel htmlFor="task-milestone">Milestone</FieldLabel>
                <NativeSelect
                  id="task-milestone"
                  name="milestoneId"
                  defaultValue={task?.milestoneId ?? ''}
                >
                  <option value="">None</option>
                  {visibleMilestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="task-notes">Notes</FieldLabel>
              <Textarea id="task-notes" name="notes" rows={3} defaultValue={task?.notes ?? ''} />
            </Field>
          </FieldGroup>
          <div className="flex items-center gap-2">
            <SubmitButton>{editing ? 'Save changes' : 'Add task'}</SubmitButton>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            {task && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="ml-auto"
                      aria-label="Delete task"
                    />
                  }
                >
                  <Trash2Icon />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Subtasks go with it. This cannot be undone from the app.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleting}
                      onClick={() =>
                        startDelete(async () => {
                          const result = await deleteTaskAction(task.id);
                          if (result.ok) close();
                        })
                      }
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
        {task && (
          <section className="border-t p-4">
            <h3 className="tracking-eyebrow text-muted-foreground mb-2 flex items-center justify-between text-xs uppercase">
              Subtasks
              <Link
                href={`${pathname}?${subtaskParams.toString()}`}
                className="text-primary tracking-normal normal-case hover:underline"
              >
                Add subtask
              </Link>
            </h3>
            {subtasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">None yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {subtasks.map((s) => {
                  const p = new URLSearchParams(params.toString());
                  p.set('task', s.id);
                  p.delete('new');
                  return (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={s.status === 'done' ? 'text-muted-foreground line-through' : ''}
                      >
                        {s.title}
                      </span>
                      <Link
                        href={`${pathname}?${p.toString()}`}
                        className="text-primary ml-auto text-xs hover:underline"
                      >
                        Open
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </SheetContent>
    </Sheet>
  );
}
