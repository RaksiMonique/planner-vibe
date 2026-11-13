'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { ACCENT_LABELS, ACCENTS } from '@/features/life-segments/schema';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createShiftKindAction, updateShiftKindAction } from '../actions';
import type { ShiftKindRow } from '../queries';
import { KIND_NAME_MAX, SHIFT_KIND_LABELS, SHIFT_KINDS } from '../schema';
import { DialogShell } from './dialog-shell';

export function ShiftKindFormDialog({
  kind,
  trigger,
  variant,
  size,
}: {
  kind?: ShiftKindRow;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={kind ? 'Edit kind' : 'New kind of shift'}
      description="A kind of your own, such as Night or Training. It counts as working, on call or off, which is what the calendar shows."
      trigger={trigger}
      variant={variant}
      size={size}
      className="sm:max-w-md"
    >
      {(close) => <ShiftKindForm kind={kind} close={close} />}
    </DialogShell>
  );
}

function ShiftKindForm({ kind, close }: { kind?: ShiftKindRow; close: () => void }) {
  const action = kind ? updateShiftKindAction : createShiftKindAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {kind && <input type="hidden" name="id" value={kind.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="kind-name">Name</FieldLabel>
          <Input
            id="kind-name"
            name="name"
            defaultValue={kind?.name ?? ''}
            maxLength={KIND_NAME_MAX}
            placeholder="Early, Night, Training"
            required
            autoFocus
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="kind-counts-as">Counts as</FieldLabel>
            <NativeSelect
              id="kind-counts-as"
              name="countsAs"
              defaultValue={kind?.countsAs ?? 'work'}
            >
              {SHIFT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SHIFT_KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>Decides the status its days get.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="kind-accent">Colour</FieldLabel>
            <ChoiceSelect
              id="kind-accent"
              name="accent"
              defaultValue={kind?.accent ?? 'burgundy'}
              options={ACCENTS.map((a) => ({
                value: a,
                label: (
                  <span className="flex items-center gap-2">
                    <SegmentDot accent={a} />
                    {ACCENT_LABELS[a]}
                  </span>
                ),
              }))}
            />
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
        <SubmitButton>{kind ? 'Save changes' : 'Add kind'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
