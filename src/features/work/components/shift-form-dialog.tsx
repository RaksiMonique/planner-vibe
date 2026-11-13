'use client';

import { useActionState, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { moveWith } from '@/lib/dates';
import { createShiftAction, updateShiftAction } from '../actions';
import type { Shift } from '../queries';
import {
  LAST_DAY_AFTER_FIRST,
  REPEAT_UNTIL_AFTER_FIRST,
  SHIFT_KIND_LABELS,
  SHIFT_KINDS,
  SHIFT_REPEAT_MAX,
  SHIFT_REPEAT_UNIT_LABELS,
  SHIFT_REPEAT_UNITS,
  repeatLabel,
  type ShiftKind,
  type ShiftRepeatUnit,
} from '../schema';
import { DialogShell } from './dialog-shell';

export function ShiftFormDialog({
  shift,
  defaultDate,
  trigger,
  variant,
  size,
}: {
  shift?: Shift;
  defaultDate: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={shift ? 'Edit shift' : 'Add a shift'}
      description="One day, a block of days, or a block that comes back every few weeks. Anything placed on a date replaces the pattern for that date."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => <ShiftForm shift={shift} defaultDate={defaultDate} close={close} />}
    </DialogShell>
  );
}

function ShiftForm({
  shift,
  defaultDate,
  close,
}: {
  shift?: Shift;
  defaultDate: string;
  close: () => void;
}) {
  const action = shift ? updateShiftAction : createShiftAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  const [kind, setKind] = useState<ShiftKind>(shift?.kind ?? 'work');
  const [firstDay, setFirstDay] = useState(shift?.date ?? defaultDate);
  const [lastDay, setLastDay] = useState(shift?.endDate ?? '');
  const [repeatUnit, setRepeatUnit] = useState<ShiftRepeatUnit>(
    shift && shift.repeatEvery > 0 ? shift.repeatUnit : 'none'
  );
  const [repeatEvery, setRepeatEvery] = useState(String(shift?.repeatEvery || 1));
  const [until, setUntil] = useState(shift?.repeatUntil ?? '');
  const repeats = repeatUnit !== 'none';
  const everyLabel = repeats ? repeatLabel(Number(repeatEvery) || 1, repeatUnit) : '';
  // Phone pickers ignore `min`, so the order of the days is checked here as well.
  const lastTooEarly = Boolean(lastDay) && lastDay < firstDay;
  const untilTooEarly = repeats && Boolean(until) && until < firstDay;
  const lastDayRef = useRef<HTMLInputElement>(null);
  const untilRef = useRef<HTMLInputElement>(null);
  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        if (!lastTooEarly && !untilTooEarly) return;
        e.preventDefault();
        (lastTooEarly ? lastDayRef : untilRef).current?.focus();
      }}
    >
      {shift && <input type="hidden" name="id" value={shift.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'date')}>
            <FieldLabel htmlFor="shift-date">First day</FieldLabel>
            <Input
              id="shift-date"
              name="date"
              type="date"
              value={firstDay}
              onChange={(e) => {
                const next = e.target.value;
                // The block keeps its length when its first day moves.
                setLastDay((current) => moveWith(current, firstDay, next));
                setFirstDay(next);
              }}
              required
              autoFocus
            />
            <FieldError errors={fieldErrors(state, 'date')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'endDate') || lastTooEarly}>
            <FieldLabel htmlFor="shift-end-date">Last day</FieldLabel>
            <Input
              ref={lastDayRef}
              id="shift-end-date"
              name="endDate"
              type="date"
              value={lastDay}
              onChange={(e) => setLastDay(e.target.value)}
              min={firstDay || undefined}
              aria-invalid={lastTooEarly || undefined}
            />
            <FieldDescription>Leave empty for a single day.</FieldDescription>
            <FieldError
              errors={
                lastTooEarly ? [{ message: LAST_DAY_AFTER_FIRST }] : fieldErrors(state, 'endDate')
              }
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="shift-kind">Kind</FieldLabel>
            <NativeSelect
              id="shift-kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ShiftKind)}
            >
              {SHIFT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SHIFT_KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>
              {kind === 'off'
                ? 'Days off, even if the pattern says otherwise.'
                : 'Replaces whatever the pattern has on those days.'}
            </FieldDescription>
          </Field>
          <Field data-invalid={hasFieldError(state, 'label')}>
            <FieldLabel htmlFor="shift-label">Label</FieldLabel>
            <Input
              id="shift-label"
              name="label"
              defaultValue={shift?.label ?? ''}
              maxLength={60}
              placeholder={kind === 'off' ? 'Swapped with Ana' : 'Overtime, cover, training'}
            />
            <FieldError errors={fieldErrors(state, 'label')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'startTime')}>
            <FieldLabel htmlFor="shift-start">Start</FieldLabel>
            <Input
              id="shift-start"
              name="startTime"
              type="time"
              defaultValue={shift?.startTime?.slice(0, 5) ?? ''}
              disabled={kind === 'off'}
            />
            <FieldError errors={fieldErrors(state, 'startTime')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'endTime')}>
            <FieldLabel htmlFor="shift-end">End</FieldLabel>
            <Input
              id="shift-end"
              name="endTime"
              type="time"
              defaultValue={shift?.endTime?.slice(0, 5) ?? ''}
              disabled={kind === 'off'}
            />
            <FieldDescription>An end before the start runs into the next day.</FieldDescription>
            <FieldError errors={fieldErrors(state, 'endTime')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'repeatUnit')}>
            <FieldLabel htmlFor="shift-repeat">Repeats</FieldLabel>
            <NativeSelect
              id="shift-repeat"
              name="repeatUnit"
              value={repeatUnit}
              onChange={(e) => setRepeatUnit(e.target.value as ShiftRepeatUnit)}
            >
              {SHIFT_REPEAT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {SHIFT_REPEAT_UNIT_LABELS[unit]}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={fieldErrors(state, 'repeatUnit')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'repeatEvery')}>
            <FieldLabel htmlFor="shift-repeat-every">Every</FieldLabel>
            <Input
              id="shift-repeat-every"
              name="repeatEvery"
              type="number"
              inputMode="numeric"
              min={1}
              max={SHIFT_REPEAT_MAX}
              value={repeatEvery}
              onChange={(e) => setRepeatEvery(e.target.value)}
              disabled={!repeats}
            />
            <FieldDescription>
              {repeats
                ? everyLabel.charAt(0).toUpperCase() + everyLabel.slice(1)
                : 'How many weeks or months apart.'}
            </FieldDescription>
            <FieldError errors={fieldErrors(state, 'repeatEvery')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'repeatUntil') || untilTooEarly}>
            <FieldLabel htmlFor="shift-repeat-until">Repeat until</FieldLabel>
            <Input
              ref={untilRef}
              id="shift-repeat-until"
              name="repeatUntil"
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              min={firstDay || undefined}
              aria-invalid={untilTooEarly || undefined}
              disabled={!repeats}
            />
            <FieldDescription>
              {repeats ? 'Leave empty to keep it going.' : 'Only for a shift that repeats.'}
            </FieldDescription>
            <FieldError
              errors={
                untilTooEarly
                  ? [{ message: REPEAT_UNTIL_AFTER_FIRST }]
                  : fieldErrors(state, 'repeatUntil')
              }
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="shift-note">Note</FieldLabel>
          <Textarea id="shift-note" name="note" rows={2} defaultValue={shift?.note ?? ''} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{shift ? 'Save changes' : 'Add shift'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
