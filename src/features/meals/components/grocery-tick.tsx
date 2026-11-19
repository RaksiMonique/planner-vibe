'use client';

import { useOptimistic, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toggleGroceryItemAction } from '../actions';
import { formatQuantity } from '../consolidate';
import type { GroceryItem } from '../queries';

/** A compact grocery row for the dashboard: a tick and the name, nothing else. */
export function GroceryTick({ item }: { item: GroceryItem }) {
  const [purchased, setPurchased] = useOptimistic(item.isPurchased);
  const [, startTransition] = useTransition();
  const amount = [formatQuantity(item.quantity), item.unit ?? ''].join(' ').trim();
  return (
    <li className="flex items-center gap-2 text-sm">
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
        className={cn('min-w-0 flex-1 truncate', purchased && 'text-muted-foreground line-through')}
      >
        {item.name}
      </span>
      {amount && <span className="text-muted-foreground text-xs tabular-nums">{amount}</span>}
    </li>
  );
}
