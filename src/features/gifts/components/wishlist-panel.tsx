'use client';

import { useActionState } from 'react';
import {
  CheckIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UndoIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import {
  createWishAction,
  deleteWishAction,
  setWishAcquiredAction,
  updateWishAction,
} from '../actions';
import { formatMoney } from '../grouping';
import type { WishlistItem } from '../queries';
import { PRIORITY_LABELS } from '../schema';
import { DialogShell } from './dialog-shell';

export function WishlistPanel({ items, currency }: { items: WishlistItem[]; currency: string }) {
  const [state, formAction] = useActionState(createWishAction, null);
  const open = items.filter((i) => !i.acquiredAt);
  const acquired = items.filter((i) => i.acquiredAt);
  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            name="title"
            placeholder="Something you would love"
            aria-label="Wish"
            required
            maxLength={200}
          />
          <SubmitButton size="sm" variant="outline" pendingLabel="Adding…">
            <PlusIcon data-icon="inline-start" />
            Add
          </SubmitButton>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            name="price"
            type="number"
            min={0}
            step="0.01"
            placeholder={`Price (${currency})`}
            aria-label="Price"
          />
          <NativeSelect name="priority" defaultValue="2" aria-label="Priority">
            {[1, 2, 3].map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </NativeSelect>
        </div>
        {state && !state.ok && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </form>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing on your wishlist yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {[...open, ...acquired].map((item) => (
            <li
              key={item.id}
              className={cn(
                'bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                item.acquiredAt && 'opacity-70'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn('truncate', item.acquiredAt && 'line-through')}>{item.title}</p>
                <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                  <span>{PRIORITY_LABELS[item.priority]}</span>
                  {item.price && <span>{formatMoney(item.price, currency)}</span>}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Link <ExternalLinkIcon className="size-3" aria-hidden />
                    </a>
                  )}
                </p>
              </div>
              {item.acquiredAt && <Badge variant="secondary">Got it</Badge>}
              <form action={setWishAcquiredAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="acquired" value={item.acquiredAt ? '' : 'on'} />
                <Button
                  type="submit"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={
                    item.acquiredAt
                      ? `Mark ${item.title} as still wanted`
                      : `Mark ${item.title} as acquired`
                  }
                >
                  {item.acquiredAt ? <UndoIcon /> : <CheckIcon />}
                </Button>
              </form>
              <WishFormDialog item={item} currency={currency} />
              <ConfirmActionButton
                action={deleteWishAction}
                fields={{ id: item.id }}
                title={`Remove "${item.title}" from your wishlist?`}
                variant="ghost"
                size="icon-xs"
                trigger={
                  <>
                    <Trash2Icon />
                    <span className="sr-only">Remove {item.title}</span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WishFormDialog({ item, currency }: { item: WishlistItem; currency: string }) {
  return (
    <DialogShell
      title="Edit wish"
      trigger={
        <>
          <PencilIcon />
          <span className="sr-only">Edit {item.title}</span>
        </>
      }
      variant="ghost"
      size="icon-xs"
    >
      {(close) => <WishForm item={item} currency={currency} close={close} />}
    </DialogShell>
  );
}

function WishForm({
  item,
  currency,
  close,
}: {
  item: WishlistItem;
  currency: string;
  close: () => void;
}) {
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await updateWishAction(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={item.id} />
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="wish-title">Wish</FieldLabel>
          <Input id="wish-title" name="title" defaultValue={item.title} required maxLength={200} />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'price')}>
            <FieldLabel htmlFor="wish-price">Price ({currency})</FieldLabel>
            <Input
              id="wish-price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={item.price ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'price')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="wish-priority">Priority</FieldLabel>
            <NativeSelect id="wish-priority" name="priority" defaultValue={String(item.priority)}>
              {[1, 2, 3].map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'url')}>
          <FieldLabel htmlFor="wish-url">Link</FieldLabel>
          <Input
            id="wish-url"
            name="url"
            type="url"
            defaultValue={item.url ?? ''}
            placeholder="https://"
          />
          <FieldError errors={fieldErrors(state, 'url')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="wish-notes">Notes</FieldLabel>
          <Textarea id="wish-notes" name="notes" rows={2} defaultValue={item.notes ?? ''} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>Save changes</SubmitButton>
      </DialogFooter>
    </form>
  );
}
