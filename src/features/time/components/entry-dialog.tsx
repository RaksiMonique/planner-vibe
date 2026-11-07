'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { deleteEntry, saveEntry } from '../actions';
import type { EntryFormValues } from '../service';
import type { ProjectOption, SegmentOption, TaskOption } from './block-dialog';

export type EntryDialogValues = Partial<EntryFormValues> & { durationMinutes?: number };

const fieldErrors = (state: ActionResult<unknown> | null, name: string) =>
  state && !state.ok ? state.fieldErrors?.[name]?.map((message) => ({ message })) : undefined;

export function EntryDialog({
  open,
  onOpenChange,
  values,
  segments,
  projects,
  tasks,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: EntryDialogValues;
  segments: SegmentOption[];
  projects: ProjectOption[];
  tasks: TaskOption[];
  onSaved: () => void;
}) {
  const formKey = `${values.id ?? 'new'}:${values.startedAt ?? ''}:${values.timeBlockId ?? ''}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {values.id ? 'Edit logged time' : 'Log actual time'}
          </DialogTitle>
          <DialogDescription>
            What really happened. Give an end time or a duration, whichever is easier.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <EntryForm
            key={formKey}
            values={values}
            segments={segments}
            projects={projects}
            tasks={tasks}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  values,
  segments,
  projects,
  tasks,
  onSaved,
}: {
  values: EntryDialogValues;
  segments: SegmentOption[];
  projects: ProjectOption[];
  tasks: TaskOption[];
  onSaved: () => void;
}) {
  const [state, action] = useActionState(saveEntry, null);
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
    const result = await deleteEntry(values.id);
    setDeleting(false);
    if (result.ok) onSaved();
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.timeBlockId && <input type="hidden" name="timeBlockId" value={values.timeBlockId} />}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="entry-segment">Life Segment</FieldLabel>
          <NativeSelect
            id="entry-segment"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="entry-start">Started</FieldLabel>
            <Input
              id="entry-start"
              name="startedAt"
              type="datetime-local"
              defaultValue={values.startedAt ?? ''}
              required
            />
            <FieldError errors={fieldErrors(state, 'startedAt')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="entry-end">Ended</FieldLabel>
            <Input
              id="entry-end"
              name="endedAt"
              type="datetime-local"
              defaultValue={values.endedAt ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'endedAt')} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="entry-duration">Or duration (minutes)</FieldLabel>
          <Input
            id="entry-duration"
            name="durationMinutes"
            type="number"
            min={1}
            max={1440}
            defaultValue={values.durationMinutes ?? ''}
          />
          <FieldDescription>Used when no end time is given.</FieldDescription>
          <FieldError errors={fieldErrors(state, 'durationMinutes')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="entry-project">Project</FieldLabel>
            <NativeSelect id="entry-project" name="projectId" defaultValue={values.projectId ?? ''}>
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="entry-task">Task</FieldLabel>
            <NativeSelect id="entry-task" name="taskId" defaultValue={values.taskId ?? ''}>
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
          <FieldLabel htmlFor="entry-note">Note</FieldLabel>
          <Textarea id="entry-note" name="note" rows={2} defaultValue={values.note ?? ''} />
        </Field>
      </FieldGroup>

      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <DialogFooter className="sm:justify-between">
        {values.id ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button type="button" variant="destructive" size="sm" disabled={deleting} />}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this logged time?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <span />
        )}
        <SubmitButton>{values.id ? 'Save changes' : 'Log time'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
