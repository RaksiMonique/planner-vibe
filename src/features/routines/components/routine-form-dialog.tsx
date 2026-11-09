'use client';

import { useActionState, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from 'lucide-react';
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
import { SubmitButton } from '@/components/shared/submit-button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import { createRoutineAction, updateRoutineAction } from '../actions';
import type { RoutineRow } from '../queries';
import { DAY_LABELS, ROUTINE_KIND_LABELS, ROUTINE_KINDS } from '../schema';

export type HabitOption = { id: string; name: string };

type StepDraft = { key: string; id?: string; title: string; minutes: string; habitId: string };

let nextKey = 0;
const draft = (partial: Partial<StepDraft> = {}): StepDraft => ({
  key: `s${nextKey++}`,
  title: '',
  minutes: '',
  habitId: '',
  ...partial,
});

export function RoutineFormDialog({
  segments,
  habitOptions,
  routine,
  defaultSegmentId,
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  segments: SegmentRef[];
  habitOptions: HabitOption[];
  routine?: RoutineRow;
  defaultSegmentId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {routine ? 'Edit routine' : 'New routine'}
          </DialogTitle>
          <DialogDescription>
            Ordered steps you run on chosen days. Steps can record a habit check-in when ticked.
          </DialogDescription>
        </DialogHeader>
        <RoutineForm
          segments={segments}
          habitOptions={habitOptions}
          routine={routine}
          defaultSegmentId={defaultSegmentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function RoutineForm({
  segments,
  habitOptions,
  routine,
  defaultSegmentId,
  onDone,
}: {
  segments: SegmentRef[];
  habitOptions: HabitOption[];
  routine?: RoutineRow;
  defaultSegmentId?: string;
  onDone: () => void;
}) {
  const action = routine ? updateRoutineAction : createRoutineAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );
  const [steps, setSteps] = useState<StepDraft[]>(() =>
    routine && routine.steps.length > 0
      ? routine.steps.map((s) =>
          draft({
            id: s.id,
            title: s.title,
            minutes: s.durationMinutes ? String(s.durationMinutes) : '',
            habitId: s.habitId ?? '',
          })
        )
      : [draft()]
  );
  const days = new Set(routine?.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 0]);

  const stepsJson = JSON.stringify(
    steps.map((s) => ({
      id: s.id,
      title: s.title,
      durationMinutes: s.minutes ? Number(s.minutes) : undefined,
      habitId: s.habitId || undefined,
    }))
  );

  function patch(key: string, change: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...change } : s)));
  }
  function move(index: number, delta: number) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {routine && <input type="hidden" name="id" value={routine.id} />}
      <input type="hidden" name="steps" value={stepsJson} />
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="routine-name">Name</FieldLabel>
          <Input
            id="routine-name"
            name="name"
            defaultValue={routine?.name}
            required
            maxLength={120}
            autoFocus
            placeholder="Morning routine"
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="routine-kind">Kind</FieldLabel>
            <ChoiceSelect
              id="routine-kind"
              name="kind"
              defaultValue={routine?.kind ?? 'morning'}
              options={ROUTINE_KINDS.map((k) => ({ value: k, label: ROUTINE_KIND_LABELS[k] }))}
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="routine-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="routine-segment"
              segments={segments}
              defaultValue={routine?.lifeSegmentId ?? defaultSegmentId}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'daysOfWeek')}>
          <FieldLabel>Days</FieldLabel>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <label
                key={d}
                className="has-checked:border-primary has-checked:bg-secondary has-checked:text-secondary-foreground bg-card hover:bg-muted inline-flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs select-none"
              >
                <input
                  type="checkbox"
                  name="daysOfWeek[]"
                  value={d}
                  defaultChecked={days.has(d)}
                  className="sr-only"
                />
                {DAY_LABELS[d]}
              </label>
            ))}
          </div>
          <FieldError errors={fieldErrors(state, 'daysOfWeek')} />
        </Field>

        <Field data-invalid={hasFieldError(state, 'steps')}>
          <FieldLabel>Steps</FieldLabel>
          <ol className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <li key={s.key} className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5 text-xs tabular-nums">{i + 1}.</span>
                  <Input
                    aria-label={`Step ${i + 1} title`}
                    value={s.title}
                    onChange={(e) => patch(s.key, { title: e.target.value })}
                    placeholder="Make the bed"
                    maxLength={120}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move step up"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move step down"
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove step"
                    disabled={steps.length === 1}
                    onClick={() => setSteps((prev) => prev.filter((x) => x.key !== s.key))}
                  >
                    <XIcon />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-7">
                  <Input
                    aria-label={`Step ${i + 1} minutes`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={600}
                    value={s.minutes}
                    onChange={(e) => patch(s.key, { minutes: e.target.value })}
                    placeholder="min"
                    className="w-20"
                  />
                  <NativeSelect
                    aria-label={`Step ${i + 1} habit`}
                    value={s.habitId}
                    onChange={(e) => patch(s.key, { habitId: e.target.value })}
                    className={cn('w-auto min-w-40 flex-1', !s.habitId && 'text-muted-foreground')}
                  >
                    <option value="">No linked habit</option>
                    {habitOptions.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setSteps((prev) => [...prev, draft()])}
          >
            <PlusIcon data-icon="inline-start" />
            Add step
          </Button>
          <FieldDescription>
            Ticking a step that links a habit records that habit&apos;s check-in for the day.
          </FieldDescription>
          <FieldError errors={fieldErrors(state, 'steps')} />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isTemplate"
            defaultChecked={routine?.isTemplate ?? false}
            className="accent-primary size-4"
          />
          Keep as a template rather than a live routine
        </label>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{routine ? 'Save changes' : 'Create routine'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
