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
import { SubmitButton } from '@/components/shared/submit-button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ActionResult } from '@/lib/action-result';
import { createPlanAction } from '../actions';
import { BIBLE_BOOKS } from '../bible-books';
import { PLAN_PRESETS, type PlanPreset } from '../plans';
import { PLAN_PRESET_KEYS } from '../schema';

export function PlanFormDialog({
  segments,
  defaultSegmentId,
  todayKey,
  queueAfter = [],
  trigger,
  variant = 'outline',
  size = 'sm',
}: {
  segments: SegmentRef[];
  defaultSegmentId?: string;
  todayKey: string;
  /** Unfinished plans with nothing queued behind them yet. */
  queueAfter?: Array<{ id: string; name: string }>;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<PlanPreset>('whole');
  const [after, setAfter] = useState('none');
  const queued = after !== 'none';
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await createPlanAction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">New reading plan</DialogTitle>
          <DialogDescription>
            A set of books read so many chapters a day. Start it now, or queue it behind another
            plan.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={hasFieldError(state, 'name')}>
              <FieldLabel htmlFor="plan-name">Name</FieldLabel>
              <Input
                id="plan-name"
                name="name"
                required
                maxLength={120}
                autoFocus
                placeholder="New Testament in a year"
              />
              <FieldError errors={fieldErrors(state, 'name')} />
            </Field>
            <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
              <FieldLabel htmlFor="plan-segment">Life Segment</FieldLabel>
              <SegmentSelect
                id="plan-segment"
                segments={segments}
                defaultValue={defaultSegmentId}
              />
              <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-preset">Books</FieldLabel>
              <ChoiceSelect
                id="plan-preset"
                name="preset"
                value={preset}
                onValueChange={(v) => setPreset(v as PlanPreset)}
                options={PLAN_PRESET_KEYS.map((k) => ({ value: k, label: PLAN_PRESETS[k].label }))}
              />
            </Field>
            {preset === 'custom' && (
              <Field data-invalid={hasFieldError(state, 'bookIds')}>
                <FieldLabel>Choose books</FieldLabel>
                <div className="grid max-h-56 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-3">
                  {BIBLE_BOOKS.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <Checkbox name="bookIds[]" value={String(b.id)} />
                      <span className="truncate">{b.name}</span>
                    </label>
                  ))}
                </div>
                <FieldError errors={fieldErrors(state, 'bookIds')} />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={hasFieldError(state, 'chaptersPerDay')}>
                <FieldLabel htmlFor="plan-per-day">Chapters a day</FieldLabel>
                <Input
                  id="plan-per-day"
                  name="chaptersPerDay"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  defaultValue={1}
                  required
                />
                <FieldDescription>
                  Three a day finishes the whole Bible in about 15 months.
                </FieldDescription>
                <FieldError errors={fieldErrors(state, 'chaptersPerDay')} />
              </Field>
              <Field data-invalid={hasFieldError(state, 'startDate')}>
                <FieldLabel htmlFor="plan-start">Start date</FieldLabel>
                <Input
                  id="plan-start"
                  name="startDate"
                  type="date"
                  defaultValue={todayKey}
                  required
                />
                <FieldError errors={fieldErrors(state, 'startDate')} />
              </Field>
            </div>
            {queueAfter.length > 0 && (
              <Field>
                <FieldLabel htmlFor="plan-after">Starts after</FieldLabel>
                <ChoiceSelect
                  id="plan-after"
                  name="startsAfterPlanId"
                  value={after}
                  onValueChange={setAfter}
                  options={[
                    { value: 'none', label: 'Nothing, start now' },
                    ...queueAfter.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
                <FieldDescription>
                  {queued
                    ? 'It waits, then starts the day that plan is finished. The start date moves to that day.'
                    : 'Starting now pauses any other active plan.'}
                </FieldDescription>
              </Field>
            )}
          </FieldGroup>
          {state && !state.ok && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <SubmitButton>{queued ? 'Queue plan' : 'Start plan'}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
