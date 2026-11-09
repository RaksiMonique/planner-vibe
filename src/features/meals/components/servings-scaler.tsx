'use client';

import { useState } from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatQuantity, scaleIngredients } from '../consolidate';
import type { Ingredient } from '../queries';

/** The ingredient list with a serving count the reader can change; quantities follow. */
export function ServingsScaler({ base, ingredients }: { base: number; ingredients: Ingredient[] }) {
  const [servings, setServings] = useState(base);
  const scaled = scaleIngredients(ingredients, base, servings);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Servings</span>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label="Fewer servings"
          onClick={() => setServings((s) => Math.max(1, s - 1))}
        >
          <MinusIcon />
        </Button>
        <span className="w-6 text-center tabular-nums" aria-live="polite">
          {servings}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label="More servings"
          onClick={() => setServings((s) => Math.min(99, s + 1))}
        >
          <PlusIcon />
        </Button>
        {servings !== base && (
          <Button type="button" variant="ghost" size="xs" onClick={() => setServings(base)}>
            Reset to {base}
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {scaled.map((i) => (
          <li key={i.id} className="flex items-baseline gap-2">
            <span className="w-20 shrink-0 text-right tabular-nums">
              {formatQuantity(i.quantity)} {i.unit ?? ''}
            </span>
            <span>{i.name}</span>
            {i.note && <span className="text-muted-foreground text-xs">{i.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
