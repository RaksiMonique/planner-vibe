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
import { SegmentDot } from '@/components/shared/segment-badge';
import { SubmitButton } from '@/components/shared/submit-button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import { ACCENT_LABELS, ACCENTS } from '@/features/life-segments/schema';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ActionResult } from '@/lib/action-result';
import { createHabitAction, updateHabitAction } from '../actions';
import type { Habit } from '../queries';
import { FREQUENCY_LABELS, HABIT_FREQUENCIES, PERIOD_NOUN, type HabitFrequency } from '../schema';

export function HabitFormDialog({
  segments,
  habit,
  defaultSegmentId,
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  segments: SegmentRef[];
  habit?: Habit;
  defaultSegmentId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {habit ? 'Edit habit' : 'New habit'}
          </DialogTitle>
          <DialogDescription>
            A repeated behaviour. Check-ins record what actually happened each day.
          </DialogDescription>
        </DialogHeader>
        <HabitForm
          segments={segments}
          habit={habit}
          defaultSegmentId={defaultSegmentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function HabitForm({
  segments,
  habit,
  defaultSegmentId,
  onDone,
}: {
  segments: SegmentRef[];
  habit?: Habit;
  defaultSegmentId?: string;
  onDone: () => void;
}) {
  const action = habit ? updateHabitAction : createHabitAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? 'daily');

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {habit && <input type="hidden" name="id" value={habit.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="habit-name">Name</FieldLabel>
          <Input
            id="habit-name"
            name="name"
            defaultValue={habit?.name}
            required
            maxLength={120}
            autoFocus
            placeholder="Read for 20 minutes"
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
          <FieldLabel htmlFor="habit-segment">Life Segment</FieldLabel>
          <SegmentSelect
            id="habit-segment"
            segments={segments}
            defaultValue={habit?.lifeSegmentId ?? defaultSegmentId}
          />
          <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="habit-frequency">Frequency</FieldLabel>
            <ChoiceSelect
              id="habit-frequency"
              name="frequency"
              value={frequency}
              onValueChange={(v) => setFrequency(v as HabitFrequency)}
              options={HABIT_FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }))}
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'target')}>
            <FieldLabel htmlFor="habit-target">Times per {PERIOD_NOUN[frequency]}</FieldLabel>
            <Input
              id="habit-target"
              name="target"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              defaultValue={habit?.target ?? 1}
              required
            />
            <FieldError errors={fieldErrors(state, 'target')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="habit-accent">Colour</FieldLabel>
            <ChoiceSelect
              id="habit-accent"
              name="accent"
              defaultValue={habit?.accent ?? 'segment'}
              options={[
                { value: 'segment', label: 'Same as the Life Segment' },
                ...ACCENTS.map((a) => ({
                  value: a,
                  label: (
                    <span className="flex items-center gap-2">
                      <SegmentDot accent={a} />
                      {ACCENT_LABELS[a]}
                    </span>
                  ),
                })),
              ]}
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'reminderTime')}>
            <FieldLabel htmlFor="habit-reminder">Reminder time</FieldLabel>
            <Input
              id="habit-reminder"
              name="reminderTime"
              type="time"
              defaultValue={habit?.reminderTime?.slice(0, 5) ?? ''}
            />
            <FieldDescription>Optional. Reminders are delivered in the app.</FieldDescription>
            <FieldError errors={fieldErrors(state, 'reminderTime')} />
          </Field>
        </div>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{habit ? 'Save changes' : 'Create habit'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
