'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createGiftAction, updateGiftAction } from '../actions';
import type { Gift, GiftRecipient } from '../queries';
import { GIFT_STATUS_LABELS, GIFT_STATUSES } from '../schema';
import { DialogShell } from './dialog-shell';

export function GiftFormDialog({
  gift,
  recipients,
  segments,
  currency,
  defaultRecipientId,
  defaultSegmentId,
  trigger,
  variant,
  size,
}: {
  gift?: Gift;
  recipients: Pick<GiftRecipient, 'id' | 'name'>[];
  segments: SegmentRef[];
  currency: string;
  defaultRecipientId?: string;
  defaultSegmentId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={gift ? 'Edit gift' : 'Add a gift'}
      description="An idea becomes planned, then purchased, wrapped and given."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => (
        <GiftForm
          gift={gift}
          recipients={recipients}
          segments={segments}
          currency={currency}
          defaultRecipientId={defaultRecipientId}
          defaultSegmentId={defaultSegmentId}
          close={close}
        />
      )}
    </DialogShell>
  );
}

function GiftForm({
  gift,
  recipients,
  segments,
  currency,
  defaultRecipientId,
  defaultSegmentId,
  close,
}: {
  gift?: Gift;
  recipients: Pick<GiftRecipient, 'id' | 'name'>[];
  segments: SegmentRef[];
  currency: string;
  defaultRecipientId?: string;
  defaultSegmentId?: string;
  close: () => void;
}) {
  const action = gift ? updateGiftAction : createGiftAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {gift && <input type="hidden" name="id" value={gift.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="gift-title">Gift</FieldLabel>
          <Input
            id="gift-title"
            name="title"
            defaultValue={gift?.title}
            required
            maxLength={200}
            autoFocus
            placeholder="A good fountain pen"
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'recipientId')}>
            <FieldLabel htmlFor="gift-recipient">For</FieldLabel>
            <NativeSelect
              id="gift-recipient"
              name="recipientId"
              defaultValue={gift?.recipientId ?? defaultRecipientId ?? recipients[0]?.id ?? ''}
              required
            >
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={fieldErrors(state, 'recipientId')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="gift-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="gift-segment"
              segments={segments}
              defaultValue={gift?.lifeSegmentId ?? defaultSegmentId ?? null}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field>
            <FieldLabel htmlFor="gift-occasion">Occasion</FieldLabel>
            <Input
              id="gift-occasion"
              name="occasion"
              defaultValue={gift?.occasion ?? ''}
              placeholder="Birthday, Christmas, anniversary"
              maxLength={120}
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'occasionDate')}>
            <FieldLabel htmlFor="gift-date">Date</FieldLabel>
            <Input
              id="gift-date"
              name="occasionDate"
              type="date"
              defaultValue={gift?.occasionDate ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'occasionDate')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="gift-status">Status</FieldLabel>
            <NativeSelect id="gift-status" name="status" defaultValue={gift?.status ?? 'idea'}>
              {GIFT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GIFT_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={hasFieldError(state, 'budget')}>
            <FieldLabel htmlFor="gift-budget">Budget ({currency})</FieldLabel>
            <Input
              id="gift-budget"
              name="budget"
              type="number"
              min={0}
              step="0.01"
              defaultValue={gift?.budget ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'budget')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'price')}>
            <FieldLabel htmlFor="gift-price">Paid ({currency})</FieldLabel>
            <Input
              id="gift-price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={gift?.price ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'price')} />
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'url')}>
          <FieldLabel htmlFor="gift-url">Link</FieldLabel>
          <Input
            id="gift-url"
            name="url"
            type="url"
            defaultValue={gift?.url ?? ''}
            placeholder="https://"
          />
          <FieldError errors={fieldErrors(state, 'url')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="gift-notes">Notes</FieldLabel>
          <Textarea id="gift-notes" name="notes" rows={2} defaultValue={gift?.notes ?? ''} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{gift ? 'Save changes' : 'Add gift'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
