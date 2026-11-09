'use client';

import { useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { AISLES } from '../schema';

export type IngredientDraft = {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  note: string;
};

export const emptyIngredient = (): IngredientDraft => ({
  name: '',
  quantity: '',
  unit: '',
  category: '',
  note: '',
});

/** Rows of ingredients submitted as one JSON field named `ingredients`. */
export function IngredientEditor({ initial }: { initial: IngredientDraft[] }) {
  const [rows, setRows] = useState<IngredientDraft[]>(
    initial.length > 0 ? initial : [emptyIngredient()]
  );
  const update = (i: number, patch: Partial<IngredientDraft>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const payload = JSON.stringify(
    rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        quantity: r.quantity.trim() === '' ? undefined : Number(r.quantity),
        unit: r.unit.trim() || undefined,
        category: r.category || undefined,
        note: r.note.trim() || undefined,
      }))
  );

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="ingredients" value={payload} />
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[3fr_1fr_1fr_1.4fr_auto]"
        >
          <Input
            aria-label={`Ingredient ${i + 1} name`}
            placeholder="Chicken thighs"
            value={row.name}
            onChange={(e) => update(i, { name: e.target.value })}
            maxLength={120}
            className="sm:col-span-1"
          />
          <div className="flex items-center gap-1 sm:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove ingredient"
              onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
            >
              <Trash2Icon />
            </Button>
          </div>
          <Input
            aria-label={`Ingredient ${i + 1} quantity`}
            placeholder="500"
            inputMode="decimal"
            value={row.quantity}
            onChange={(e) => update(i, { quantity: e.target.value })}
          />
          <Input
            aria-label={`Ingredient ${i + 1} unit`}
            placeholder="g"
            value={row.unit}
            onChange={(e) => update(i, { unit: e.target.value })}
            maxLength={30}
          />
          <NativeSelect
            aria-label={`Ingredient ${i + 1} aisle`}
            value={row.category}
            onChange={(e) => update(i, { category: e.target.value })}
          >
            <option value="">Aisle…</option>
            {AISLES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </NativeSelect>
          <div className="hidden items-center gap-0.5 sm:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Move ingredient up"
              onClick={() => move(i, -1)}
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Move ingredient down"
              onClick={() => move(i, 1)}
            >
              <ArrowDownIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove ingredient"
              onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setRows((p) => [...p, emptyIngredient()])}
      >
        <PlusIcon data-icon="inline-start" />
        Ingredient
      </Button>
    </div>
  );
}
