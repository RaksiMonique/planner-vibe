'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { createRecipientAction, updateRecipientAction } from '../actions';
import type { GiftRecipient } from '../queries';
import { DialogShell } from './dialog-shell';

export function RecipientFormDialog({
  recipient,
  trigger,
  variant,
  size,
}: {
  recipient?: GiftRecipient;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={recipient ? `Edit ${recipient.name}` : 'Add a person'}
      description="Birthdays show up with a countdown so nothing sneaks up on you."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => <RecipientForm recipient={recipient} close={close} />}
    </DialogShell>
  );
}

function RecipientForm({ recipient, close }: { recipient?: GiftRecipient; close: () => void }) {
  const action = recipient ? updateRecipientAction : createRecipientAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {recipient && <input type="hidden" name="id" value={recipient.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="recipient-name">Name</FieldLabel>
          <Input
            id="recipient-name"
            name="name"
            defaultValue={recipient?.name}
            required
            maxLength={120}
            autoFocus
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="recipient-relationship">Relationship</FieldLabel>
            <Input
              id="recipient-relationship"
              name="relationship"
              defaultValue={recipient?.relationship ?? ''}
              placeholder="Mum, godson, colleague"
              maxLength={80}
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'birthday')}>
            <FieldLabel htmlFor="recipient-birthday">Birthday</FieldLabel>
            <Input
              id="recipient-birthday"
              name="birthday"
              type="date"
              defaultValue={recipient?.birthday ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'birthday')} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="recipient-notes">Notes</FieldLabel>
          <Textarea
            id="recipient-notes"
            name="notes"
            rows={2}
            defaultValue={recipient?.notes ?? ''}
            placeholder="Sizes, favourite colours, things they already own"
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
        <SubmitButton>{recipient ? 'Save changes' : 'Add person'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
