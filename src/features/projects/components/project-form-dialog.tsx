'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import type { GoalOption } from '@/features/goals/queries';
import { HORIZON_LABELS } from '@/features/goals/schema';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ActionResult } from '@/lib/action-result';
import { createProjectAction, updateProjectAction } from '../actions';
import type { ProjectRow } from '../queries';
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from '../schema';

export function ProjectFormDialog({
  segments,
  goalOptions,
  project,
  linkedGoalIds = [],
  defaults,
  trigger,
  variant = 'default',
}: {
  segments: SegmentRef[];
  goalOptions: GoalOption[];
  project?: ProjectRow;
  linkedGoalIds?: string[];
  defaults?: { lifeSegmentId?: string };
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size="sm" />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {project ? 'Edit project' : 'New project'}
          </DialogTitle>
          <DialogDescription>
            A defined body of work with an end, supporting one or more goals.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          segments={segments}
          goalOptions={goalOptions}
          project={project}
          linkedGoalIds={linkedGoalIds}
          defaults={defaults}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  segments,
  goalOptions,
  project,
  linkedGoalIds,
  defaults,
  onDone,
}: {
  segments: SegmentRef[];
  goalOptions: GoalOption[];
  project?: ProjectRow;
  linkedGoalIds: string[];
  defaults?: { lifeSegmentId?: string };
  onDone: () => void;
}) {
  const action = project ? updateProjectAction : createProjectAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {project && <input type="hidden" name="id" value={project.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="project-title">Title</FieldLabel>
          <Input
            id="project-title"
            name="title"
            defaultValue={project?.title}
            required
            maxLength={140}
            autoFocus
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="project-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="project-segment"
              segments={segments}
              defaultValue={project?.lifeSegmentId ?? defaults?.lifeSegmentId}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="project-status">Status</FieldLabel>
            <ChoiceSelect
              id="project-status"
              name="status"
              defaultValue={project?.status ?? 'active'}
              options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'startDate')}>
            <FieldLabel htmlFor="project-start">Start date</FieldLabel>
            <Input
              id="project-start"
              type="date"
              name="startDate"
              defaultValue={project?.startDate ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'startDate')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'dueDate')}>
            <FieldLabel htmlFor="project-due">Due date</FieldLabel>
            <Input
              id="project-due"
              type="date"
              name="dueDate"
              defaultValue={project?.dueDate ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'dueDate')} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="project-description">Description</FieldLabel>
          <Textarea
            id="project-description"
            name="description"
            defaultValue={project?.description ?? ''}
            rows={3}
            maxLength={2000}
          />
        </Field>
        <Field>
          <FieldLabel>Supports these goals</FieldLabel>
          {goalOptions.length === 0 ? (
            <FieldDescription>No active goals yet. You can link goals later.</FieldDescription>
          ) : (
            <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border p-2">
              {goalOptions.map((g) => (
                <li key={g.id}>
                  <label className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm">
                    <Checkbox
                      name="goalIds[]"
                      value={g.id}
                      defaultChecked={linkedGoalIds.includes(g.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{g.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {HORIZON_LABELS[g.horizon]}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{project ? 'Save changes' : 'Create project'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
