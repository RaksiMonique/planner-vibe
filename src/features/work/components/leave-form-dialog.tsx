'use client';

import { useActionState, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { moveWith } from '@/lib/dates';
import { createLeaveAction, updateLeaveAction } from '../actions';
import type { LeavePeriod } from '../queries';
import {
  LEAVE_END_AFTER_START,
  LEAVE_KIND_LABELS,
  LEAVE_KINDS,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUSES,
} from '../schema';
import { DialogShell } from './dialog-shell';

export function LeaveFormDialog({
  leave,
  defaultDate,
  trigger,
  variant,
  size,
}: {
  leave?: LeavePeriod;
  defaultDate: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={leave ? 'Edit leave' : 'Add leave'}
      description="Leave takes its days out of the schedule whether it is still planned, approved or already taken."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => <LeaveForm leave={leave} defaultDate={defaultDate} close={close} />}
    </DialogShell>
  );
}

function LeaveForm({
  leave,
  defaultDate,
  close,
}: {
  leave?: LeavePeriod;
  defaultDate: string;
  close: () => void;
}) {
  const action = leave ? updateLeaveAction : createLeaveAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  const [start, setStart] = useState(leave?.startDate ?? defaultDate);
  const [end, setEnd] = useState(leave?.endDate ?? defaultDate);
  // Phone pickers ignore `min`, so the order of the days is checked here as well.
  const endTooEarly = Boolean(start && end) && end < start;
  const endRef = useRef<HTMLInputElement>(null);
  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        if (!endTooEarly) return;
        e.preventDefault();
        endRef.current?.focus();
      }}
    >
      {leave && <input type="hidden" name="id" value={leave.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="leave-kind">Kind</FieldLabel>
            <NativeSelect id="leave-kind" name="kind" defaultValue={leave?.kind ?? 'annual'}>
              {LEAVE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {LEAVE_KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="leave-status">Status</FieldLabel>
            <NativeSelect id="leave-status" name="status" defaultValue={leave?.status ?? 'planned'}>
              {LEAVE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAVE_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'startDate')}>
            <FieldLabel htmlFor="leave-start">Start</FieldLabel>
            <Input
              id="leave-start"
              name="startDate"
              type="date"
              value={start}
              onChange={(e) => {
                const next = e.target.value;
                // The leave keeps its length when its start moves.
                setEnd((current) => moveWith(current, start, next));
                setStart(next);
              }}
              required
              autoFocus
            />
            <FieldError errors={fieldErrors(state, 'startDate')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'endDate') || endTooEarly}>
            <FieldLabel htmlFor="leave-end">End</FieldLabel>
            <Input
              ref={endRef}
              id="leave-end"
              name="endDate"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              min={start || undefined}
              aria-invalid={endTooEarly || undefined}
              required
            />
            <FieldError
              errors={
                endTooEarly ? [{ message: LEAVE_END_AFTER_START }] : fieldErrors(state, 'endDate')
              }
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="leave-note">Note</FieldLabel>
          <Textarea id="leave-note" name="note" rows={2} defaultValue={leave?.note ?? ''} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{leave ? 'Save changes' : 'Add leave'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
