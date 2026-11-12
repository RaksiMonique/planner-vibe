'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { createGoalAction, updateGoalAction, type GoalActionResult } from '../actions';
import { canBeChildOf, type Horizon } from '../progress';
import type { GoalOption, GoalRow } from '../queries';
import { GOAL_STATUS_LABELS, GOAL_STATUSES, HORIZON_LABELS, HORIZONS } from '../schema';

export type GoalFormDefaults = {
  lifeSegmentId?: string;
  parentGoalId?: string;
  horizon?: Horizon;
};

export function GoalFormDialog({
  segments,
  goalOptions,
  goal,
  defaults,
  trigger,
  variant = 'default',
}: {
  segments: SegmentRef[];
  goalOptions: GoalOption[];
  goal?: GoalRow;
  defaults?: GoalFormDefaults;
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
            {goal ? 'Edit goal' : 'New goal'}
          </DialogTitle>
          <DialogDescription>
            A measurable outcome. Break it down into shorter horizons rather than copying it.
          </DialogDescription>
        </DialogHeader>
        <GoalForm
          segments={segments}
          goalOptions={goalOptions}
          goal={goal}
          defaults={defaults}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The create/edit fields on their own, for any dialog that needs them. `onDone`
 * receives the saved goal so a picker can select it at once.
 */
export function GoalForm({
  segments,
  goalOptions,
  goal,
  defaults,
  onDone,
}: {
  segments: SegmentRef[];
  goalOptions: GoalOption[];
  goal?: GoalRow;
  defaults?: GoalFormDefaults;
  onDone: (saved: GoalOption) => void;
}) {
  const action = goal ? updateGoalAction : createGoalAction;
  const [state, formAction] = useActionState(
    async (prev: GoalActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone(result.data);
      return result;
    },
    null
  );
  const [horizon, setHorizon] = useState<Horizon>(goal?.horizon ?? defaults?.horizon ?? 'annual');
  const [parent, setParent] = useState<string>(
    goal?.parentGoalId ?? defaults?.parentGoalId ?? 'none'
  );

  const parentChoices = goalOptions.filter(
    (o) => o.id !== goal?.id && canBeChildOf(horizon, o.horizon)
  );
  const parentStillValid = parent === 'none' || parentChoices.some((o) => o.id === parent);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="goal-title">Title</FieldLabel>
          <Input
            id="goal-title"
            name="title"
            defaultValue={goal?.title}
            required
            maxLength={140}
            autoFocus
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="goal-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="goal-segment"
              segments={segments}
              defaultValue={goal?.lifeSegmentId ?? defaults?.lifeSegmentId}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-horizon">Horizon</FieldLabel>
            <ChoiceSelect
              id="goal-horizon"
              name="horizon"
              value={horizon}
              onValueChange={(v) => {
                setHorizon(v as Horizon);
                setParent('none');
              }}
              options={HORIZONS.map((h) => ({ value: h, label: HORIZON_LABELS[h] }))}
            />
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'parentGoalId')}>
          <FieldLabel htmlFor="goal-parent">Part of</FieldLabel>
          <ChoiceSelect
            id="goal-parent"
            name="parentGoalId"
            value={parentStillValid ? parent : 'none'}
            onValueChange={setParent}
            options={[
              { value: 'none', label: 'None (top-level goal)' },
              ...parentChoices.map((o) => ({
                value: o.id,
                label: `${o.title} · ${HORIZON_LABELS[o.horizon]}`,
              })),
            ]}
          />
          <FieldDescription>Only goals with a longer horizon are offered.</FieldDescription>
          <FieldError errors={fieldErrors(state, 'parentGoalId')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'targetDate')}>
            <FieldLabel htmlFor="goal-target-date">Target date</FieldLabel>
            <Input
              id="goal-target-date"
              type="date"
              name="targetDate"
              defaultValue={goal?.targetDate ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'targetDate')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-status">Status</FieldLabel>
            <ChoiceSelect
              id="goal-status"
              name="status"
              defaultValue={goal?.status ?? 'active'}
              options={GOAL_STATUSES.map((s) => ({ value: s, label: GOAL_STATUS_LABELS[s] }))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={hasFieldError(state, 'targetValue')}>
            <FieldLabel htmlFor="goal-target-value">Target</FieldLabel>
            <Input
              id="goal-target-value"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              name="targetValue"
              defaultValue={goal?.targetValue ?? ''}
              placeholder="e.g. 12"
            />
            <FieldError errors={fieldErrors(state, 'targetValue')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'currentValue')}>
            <FieldLabel htmlFor="goal-current-value">Current</FieldLabel>
            <Input
              id="goal-current-value"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              name="currentValue"
              defaultValue={goal?.currentValue ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'currentValue')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-unit">Unit</FieldLabel>
            <Input
              id="goal-unit"
              name="unit"
              defaultValue={goal?.unit ?? ''}
              placeholder="books"
              maxLength={30}
            />
          </Field>
        </div>
        <FieldDescription className="-mt-2">
          Optional. With a target, progress is current ÷ target. Otherwise it comes from sub-goals,
          then milestones.
        </FieldDescription>
        <Field>
          <FieldLabel htmlFor="goal-description">Description</FieldLabel>
          <Textarea
            id="goal-description"
            name="description"
            defaultValue={goal?.description ?? ''}
            rows={3}
            maxLength={2000}
          />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{goal ? 'Save changes' : 'Create goal'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
