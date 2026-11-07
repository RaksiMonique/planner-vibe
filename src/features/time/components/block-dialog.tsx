'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { ClockIcon, Trash2Icon } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { deleteBlock, saveBlock } from '../actions';
import {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  BLOCK_RECURRENCE,
  BLOCK_RECURRENCE_LABELS,
  DURATION_PRESETS,
  formatMinutes,
} from '../schema';
import type { BlockFormValues } from '../service';

export type SegmentOption = { id: string; name: string };
export type ProjectOption = { id: string; title: string };
export type TaskOption = { id: string; title: string; lifeSegmentId: string };
export type BlockDialogValues = Partial<BlockFormValues>;

const fieldErrors = (state: ActionResult<unknown> | null, name: string) =>
  state && !state.ok ? state.fieldErrors?.[name]?.map((message) => ({ message })) : undefined;

export function BlockDialog({
  open,
  onOpenChange,
  values,
  segments,
  projects,
  tasks,
  onSaved,
  onLogTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: BlockDialogValues;
  segments: SegmentOption[];
  projects: ProjectOption[];
  tasks: TaskOption[];
  onSaved: () => void;
  /** Opens the entry dialog prefilled from this block. */
  onLogTime: (values: BlockDialogValues) => void;
}) {
  const formKey = `${values.id ?? 'new'}:${values.startsAt ?? ''}:${values.duration ?? ''}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {values.id ? 'Edit time block' : 'New time block'}
          </DialogTitle>
          <DialogDescription>
            A block is planned time. Log what actually happened against it afterwards.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <BlockForm
            key={formKey}
            values={values}
            segments={segments}
            projects={projects}
            tasks={tasks}
            onSaved={onSaved}
            onLogTime={onLogTime}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BlockForm({
  values,
  segments,
  projects,
  tasks,
  onSaved,
  onLogTime,
}: {
  values: BlockDialogValues;
  segments: SegmentOption[];
  projects: ProjectOption[];
  tasks: TaskOption[];
  onSaved: () => void;
  onLogTime: (values: BlockDialogValues) => void;
}) {
  const [state, action] = useActionState(saveBlock, null);
  const [duration, setDuration] = useState(values.duration ?? '60');
  const [deleting, setDeleting] = useState(false);
  const handled = useRef<typeof state>(null);

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      onSaved();
    }
  }, [state, onSaved]);

  async function handleDelete() {
    if (!values.id) return;
    setDeleting(true);
    const result = await deleteBlock(values.id);
    setDeleting(false);
    if (result.ok) onSaved();
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="block-title">Title</FieldLabel>
          <Input
            id="block-title"
            name="title"
            defaultValue={values.title ?? ''}
            required
            autoFocus
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="block-activity">Activity</FieldLabel>
            <NativeSelect
              id="block-activity"
              name="activityType"
              defaultValue={values.activityType ?? 'deep_work'}
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="block-segment">Life Segment</FieldLabel>
            <NativeSelect
              id="block-segment"
              name="lifeSegmentId"
              defaultValue={values.lifeSegmentId ?? segments[0]?.id ?? ''}
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="block-start">Starts</FieldLabel>
            <Input
              id="block-start"
              name="startsAt"
              type="datetime-local"
              defaultValue={values.startsAt ?? ''}
              required
            />
            <FieldError errors={fieldErrors(state, 'startsAt')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="block-duration">Length</FieldLabel>
            <NativeSelect
              id="block-duration"
              name="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {DURATION_PRESETS.map((d) => (
                <option key={d} value={String(d)}>
                  {formatMinutes(d)}
                </option>
              ))}
              <option value="custom">Custom end time</option>
            </NativeSelect>
            <FieldError errors={fieldErrors(state, 'duration')} />
          </Field>
        </div>

        {duration === 'custom' && (
          <Field>
            <FieldLabel htmlFor="block-end">Ends</FieldLabel>
            <Input
              id="block-end"
              name="endsAt"
              type="datetime-local"
              defaultValue={values.endsAt ?? ''}
              required
            />
            <FieldError errors={fieldErrors(state, 'endsAt')} />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="block-project">Project</FieldLabel>
            <NativeSelect id="block-project" name="projectId" defaultValue={values.projectId ?? ''}>
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="block-task">Task</FieldLabel>
            <NativeSelect id="block-task" name="taskId" defaultValue={values.taskId ?? ''}>
              <option value="">None</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="block-recurrence">Repeats</FieldLabel>
          <NativeSelect
            id="block-recurrence"
            name="recurrence"
            defaultValue={values.recurrence ?? 'none'}
          >
            {BLOCK_RECURRENCE.map((r) => (
              <option key={r} value={r}>
                {BLOCK_RECURRENCE_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </FieldGroup>

      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <DialogFooter className="sm:justify-between">
        <div className="flex gap-2">
          {values.id && (
            <>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button type="button" variant="destructive" size="sm" disabled={deleting} />
                  }
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this block?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {values.recurrence && values.recurrence !== 'none'
                        ? 'The whole series will be removed.'
                        : 'Logged time stays; only the plan goes.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" variant="outline" size="sm" onClick={() => onLogTime(values)}>
                <ClockIcon data-icon="inline-start" />
                Log time
              </Button>
            </>
          )}
        </div>
        <SubmitButton>{values.id ? 'Save changes' : 'Add block'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
