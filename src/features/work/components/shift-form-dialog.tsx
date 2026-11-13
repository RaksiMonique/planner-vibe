'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createShiftAction, updateShiftAction } from '../actions';
import type { Shift } from '../queries';
import {
  SHIFT_KIND_LABELS,
  SHIFT_KINDS,
  SHIFT_REPEAT_LABELS,
  SHIFT_REPEAT_WEEKS,
  type ShiftKind,
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
  const [repeatWeeks, setRepeatWeeks] = useState(String(shift?.repeatWeeks ?? 0));
  const repeats = repeatWeeks !== '0';
  return (
    <form action={formAction} className="flex flex-col gap-4">
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
              onChange={(e) => setFirstDay(e.target.value)}
              required
              autoFocus
            />
            <FieldError errors={fieldErrors(state, 'date')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'endDate')}>
            <FieldLabel htmlFor="shift-end-date">Last day</FieldLabel>
            <Input
              id="shift-end-date"
              name="endDate"
              type="date"
              defaultValue={shift?.endDate ?? ''}
              min={firstDay || undefined}
            />
            <FieldDescription>Leave empty for a single day.</FieldDescription>
            <FieldError errors={fieldErrors(state, 'endDate')} />
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
          <Field data-invalid={hasFieldError(state, 'repeatWeeks')}>
            <FieldLabel htmlFor="shift-repeat">Repeats</FieldLabel>
            <NativeSelect
              id="shift-repeat"
              name="repeatWeeks"
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(e.target.value)}
            >
              {SHIFT_REPEAT_WEEKS.map((weeks) => (
                <option key={weeks} value={weeks}>
                  {SHIFT_REPEAT_LABELS[weeks]}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={fieldErrors(state, 'repeatWeeks')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'repeatUntil')}>
            <FieldLabel htmlFor="shift-repeat-until">Repeat until</FieldLabel>
            <Input
              id="shift-repeat-until"
              name="repeatUntil"
              type="date"
              defaultValue={shift?.repeatUntil ?? ''}
              min={firstDay || undefined}
              disabled={!repeats}
            />
            <FieldDescription>
              {repeats ? 'Leave empty to keep it going.' : 'Only for a shift that repeats.'}
            </FieldDescription>
            <FieldError errors={fieldErrors(state, 'repeatUntil')} />
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
