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
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { saveDocumentAction } from '../actions';
import type { VehicleDocument } from '../queries';
import { STANDARD_DOCUMENT_KINDS } from '../status';

/** Adds or edits one dated paper for a vehicle. */
export function DocumentFormDialog({
  vehicleId,
  vehicleName,
  document,
  defaultKind,
  trigger,
  variant = 'outline',
  size = 'xs',
}: {
  vehicleId: string;
  vehicleName: string;
  document?: VehicleDocument;
  /** Preset for a standard slot such as Insurance; the field stays editable. */
  defaultKind?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  const kind = document?.kind ?? defaultKind;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {document
              ? `Edit ${document.kind}`
              : kind
                ? `${kind} for ${vehicleName}`
                : 'New document'}
          </DialogTitle>
          <DialogDescription>
            A reminder goes out a month before it expires, a week before and on the day.
          </DialogDescription>
        </DialogHeader>
        <DocumentForm
          vehicleId={vehicleId}
          document={document}
          defaultKind={defaultKind}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DocumentForm({
  vehicleId,
  document,
  defaultKind,
  onDone,
}: {
  vehicleId: string;
  document?: VehicleDocument;
  defaultKind?: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await saveDocumentAction(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );
  const listId = `document-kinds-${vehicleId}`;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {document && <input type="hidden" name="id" value={document.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'kind')}>
            <FieldLabel htmlFor="document-kind">Document</FieldLabel>
            <Input
              id="document-kind"
              name="kind"
              list={listId}
              required
              maxLength={60}
              defaultValue={document?.kind ?? defaultKind ?? ''}
              placeholder="Insurance, Fitness, Road tax"
              autoFocus={!defaultKind && !document}
            />
            <datalist id={listId}>
              {STANDARD_DOCUMENT_KINDS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <FieldError errors={fieldErrors(state, 'kind')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'expiresOn')}>
            <FieldLabel htmlFor="document-expires">Expires on</FieldLabel>
            <Input
              id="document-expires"
              name="expiresOn"
              type="date"
              required
              defaultValue={document?.expiresOn ?? ''}
              autoFocus={Boolean(defaultKind) && !document}
            />
            <FieldError errors={fieldErrors(state, 'expiresOn')} />
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'reference')}>
          <FieldLabel htmlFor="document-reference">Reference</FieldLabel>
          <Input
            id="document-reference"
            name="reference"
            maxLength={120}
            defaultValue={document?.reference ?? ''}
            placeholder="Policy or certificate number"
          />
          <FieldDescription>
            Optional. Shown on the card so it is to hand at the counter.
          </FieldDescription>
          <FieldError errors={fieldErrors(state, 'reference')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="document-notes">Notes</FieldLabel>
          <Textarea
            id="document-notes"
            name="notes"
            rows={2}
            maxLength={1000}
            defaultValue={document?.notes ?? ''}
            placeholder="Who to call, what it cost last time"
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
        <SubmitButton>{document ? 'Save changes' : 'Save date'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
