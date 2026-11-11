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
import { SHIFT_KIND_LABELS, SHIFT_KINDS, type ShiftKind } from '../schema';
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
      description="A one-off shift, or an override: anything placed on a date replaces the pattern for that date."
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
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {shift && <input type="hidden" name="id" value={shift.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'date')}>
            <FieldLabel htmlFor="shift-date">Date</FieldLabel>
            <Input
              id="shift-date"
              name="date"
              type="date"
              defaultValue={shift?.date ?? defaultDate}
              required
              autoFocus
            />
            <FieldError errors={fieldErrors(state, 'date')} />
          </Field>
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
                ? 'A day off, even if the pattern says otherwise.'
                : 'Replaces whatever the pattern has on that date.'}
            </FieldDescription>
          </Field>
        </div>
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
            <FieldError errors={fieldErrors(state, 'endTime')} />
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
