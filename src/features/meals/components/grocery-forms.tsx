'use client';

import { useActionState, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PrinterIcon, ShoppingBasketIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import {
  addGroceryItemAction,
  createGroceryListAction,
  deleteGroceryItemAction,
  generateGroceryListAction,
  toggleGroceryItemAction,
  updateGroceryItemAction,
} from '../actions';
import { formatQuantity } from '../consolidate';
import type { GroceryItem } from '../queries';
import { AISLES } from '../schema';

type IdResult = ActionResult<{ id: string }> | null;

/** "Generate grocery list" for the visible week; lands on the new list. */
export function GenerateGroceryButton({ weekStart }: { weekStart: string }) {
  const router = useRouter();
  const [state, action] = useActionState(async (prev: IdResult, formData: FormData) => {
    const result = await generateGroceryListAction(prev, formData);
    if (result.ok) router.push(`/groceries/${result.data.id}`);
    return result;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="week" value={weekStart} />
      <SubmitButton size="sm" pendingLabel="Building list…">
        <ShoppingBasketIcon data-icon="inline-start" />
        Generate grocery list
      </SubmitButton>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function NewGroceryListForm() {
  const router = useRouter();
  const [state, action] = useActionState(async (prev: IdResult, formData: FormData) => {
    const result = await createGroceryListAction(prev, formData);
    if (result.ok) router.push(`/groceries/${result.data.id}`);
    return result;
  }, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input
        name="name"
        aria-label="List name"
        placeholder="Saturday market run"
        required
        maxLength={120}
        className="w-64"
      />
      <SubmitButton size="sm" pendingLabel="Creating…">
        New list
      </SubmitButton>
      {state && !state.ok && (
        <p role="alert" className="text-destructive w-full text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AddGroceryItemForm({ listId }: { listId: string }) {
  const [state, action] = useActionState(addGroceryItemAction, null as ActionResult | null);
  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1.4fr_auto]">
      <input type="hidden" name="listId" value={listId} />
      <Input
        name="name"
        aria-label="Item"
        placeholder="Add an item…"
        required
        maxLength={120}
        className="col-span-2 sm:col-span-1"
      />
      <Input name="quantity" aria-label="Quantity" placeholder="Qty" inputMode="decimal" />
      <Input name="unit" aria-label="Unit" placeholder="Unit" maxLength={30} />
      <NativeSelect name="category" aria-label="Aisle" defaultValue="">
        <option value="">Aisle…</option>
        {AISLES.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </NativeSelect>
      <SubmitButton
        size="sm"
        variant="outline"
        pendingLabel="Adding…"
        className="col-span-2 sm:col-span-1"
      >
        Add
      </SubmitButton>
      {state && !state.ok && (
        <p role="alert" className="text-destructive col-span-full text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function GroceryItemRow({ item }: { item: GroceryItem }) {
  const [purchased, setPurchased] = useOptimistic(item.isPurchased);
  const [, startTransition] = useTransition();
  const [editState, editAction] = useActionState(
    updateGroceryItemAction,
    null as ActionResult | null
  );
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={purchased}
          aria-label={`${purchased ? 'Unmark' : 'Mark'} ${item.name} as purchased`}
          onCheckedChange={(checked) =>
            startTransition(async () => {
              setPurchased(checked === true);
              await toggleGroceryItemAction(item.id, checked === true);
            })
          }
        />
        <span
          className={cn(
            'min-w-0 flex-1 text-sm',
            purchased && 'text-muted-foreground line-through'
          )}
        >
          {item.name}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatQuantity(item.quantity)} {item.unit ?? ''}
        </span>
        {item.store && (
          <span className="text-muted-foreground hidden text-xs sm:inline">{item.store}</span>
        )}
        <form action={deleteGroceryItemAction}>
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" variant="ghost" size="icon-xs" aria-label={`Remove ${item.name}`}>
            <Trash2Icon />
          </Button>
        </form>
      </div>
      <details className="pl-7">
        <summary className="text-muted-foreground cursor-pointer text-xs">Edit</summary>
        <form action={editAction} className="mt-1 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={item.id} />
          <Input
            name="quantity"
            aria-label={`${item.name} quantity`}
            defaultValue={item.quantity ?? ''}
            inputMode="decimal"
            className="w-20"
          />
          <Input
            name="unit"
            aria-label={`${item.name} unit`}
            defaultValue={item.unit ?? ''}
            className="w-20"
            maxLength={30}
          />
          <Input
            name="store"
            aria-label={`${item.name} store`}
            defaultValue={item.store ?? ''}
            placeholder="Store"
            className="w-32"
            maxLength={60}
          />
          <SubmitButton size="xs" variant="outline" pendingLabel="Saving…">
            Save
          </SubmitButton>
          {editState && !editState.ok && (
            <span role="alert" className="text-destructive text-xs">
              {editState.error}
            </span>
          )}
        </form>
      </details>
    </li>
  );
}

export function PrintButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      <PrinterIcon data-icon="inline-start" />
      Print or save as PDF
    </Button>
  );
}
