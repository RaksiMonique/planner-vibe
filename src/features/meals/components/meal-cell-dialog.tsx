'use client';

import { useActionState, useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { removeMealEntryAction, setMealEntryAction } from '../actions';
import type { MealPlanEntry, RecipeOption } from '../queries';
import { SLOT_LABELS, type MealSlot } from '../schema';
import { cn } from '@/lib/utils';

/** One slot of one day on the week grid: shows the meal and opens a picker. */
export function MealCellDialog({
  date,
  slot,
  entry,
  recipes,
  dayLabel,
}: {
  date: string;
  slot: MealSlot;
  entry: (MealPlanEntry & { recipe: RecipeOption | null }) | null;
  recipes: RecipeOption[];
  dayLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await setMealEntryAction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    null
  );
  const [choice, setChoice] = useState<string>(
    entry?.recipeId ?? (entry?.customMeal ? 'custom' : '')
  );
  const label = entry ? (entry.recipe?.title ?? entry.customMeal ?? '') : '';

  return (
    <div className="flex min-h-9 items-start gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button
              type="button"
              className={cn(
                'min-w-0 flex-1 rounded-md px-1.5 py-1 text-left text-xs transition-colors',
                entry
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              aria-label={`${SLOT_LABELS[slot]} on ${dayLabel}${label ? `: ${label}` : ''}`}
            />
          }
        >
          {entry ? (
            <span className="block truncate">
              {label}
              {entry.servings > 1 && (
                <span className="text-muted-foreground"> ×{entry.servings}</span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <PlusIcon className="size-3" aria-hidden /> Add
            </span>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {SLOT_LABELS[slot]}, {dayLabel}
            </DialogTitle>
            <DialogDescription>Pick a saved recipe or type what you will eat.</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="slot" value={slot} />
            <FieldGroup>
              <Field data-invalid={hasFieldError(state, 'recipeId')}>
                <FieldLabel htmlFor={`meal-${date}-${slot}-recipe`}>Recipe</FieldLabel>
                <NativeSelect
                  id={`meal-${date}-${slot}-recipe`}
                  name="recipeId"
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                >
                  <option value="">Choose a recipe…</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                  <option value="custom">Something else (type it below)</option>
                </NativeSelect>
                <FieldError errors={fieldErrors(state, 'recipeId')} />
              </Field>
              {(choice === 'custom' || choice === '') && (
                <Field data-invalid={hasFieldError(state, 'customMeal')}>
                  <FieldLabel htmlFor={`meal-${date}-${slot}-custom`}>Meal</FieldLabel>
                  <Input
                    id={`meal-${date}-${slot}-custom`}
                    name="customMeal"
                    defaultValue={entry?.customMeal ?? ''}
                    placeholder="Leftovers, eating out…"
                    maxLength={160}
                  />
                  <FieldError errors={fieldErrors(state, 'customMeal')} />
                </Field>
              )}
              <Field data-invalid={hasFieldError(state, 'servings')}>
                <FieldLabel htmlFor={`meal-${date}-${slot}-servings`}>Servings</FieldLabel>
                <Input
                  id={`meal-${date}-${slot}-servings`}
                  name="servings"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={entry?.servings ?? 2}
                />
                <FieldError errors={fieldErrors(state, 'servings')} />
              </Field>
            </FieldGroup>
            {state && !state.ok && (
              <p role="alert" className="text-destructive text-sm">
                {state.error}
              </p>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <SubmitButton>{entry ? 'Save meal' : 'Add meal'}</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {entry && (
        <form action={removeMealEntryAction}>
          <input type="hidden" name="id" value={entry.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${SLOT_LABELS[slot]} on ${dayLabel}`}
          >
            <XIcon />
          </Button>
        </form>
      )}
    </div>
  );
}
