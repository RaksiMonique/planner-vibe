'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { FormDialog } from '@/features/study/components/form-dialog';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createRecipeAction, updateRecipeAction } from '../actions';
import type { RecipeWithIngredients } from '../queries';
import { IngredientEditor, type IngredientDraft } from './ingredient-editor';
import { TagPicker } from './tag-picker';

type Result = ActionResult<{ id: string }>;

export function RecipeFormDialog({
  recipe,
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  recipe?: RecipeWithIngredients;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <FormDialog
      title={recipe ? 'Edit recipe' : 'New recipe'}
      description="Ingredients feed the grocery list; servings scale them."
      trigger={trigger}
      variant={variant}
      size={size}
      className="sm:max-w-2xl"
    >
      {(close) => <RecipeForm recipe={recipe} close={close} />}
    </FormDialog>
  );
}

function RecipeForm({ recipe, close }: { recipe?: RecipeWithIngredients; close: () => void }) {
  const router = useRouter();
  const action = recipe ? updateRecipeAction : createRecipeAction;
  const [state, formAction] = useActionState(async (prev: Result | null, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) {
      close();
      if (!recipe) router.push(`/meals/recipes/${result.data.id}`);
    }
    return result;
  }, null);
  // The field-error helpers are typed for plain results; the payload shape does not matter to them.
  const errorState = state as unknown as ActionResult | null;
  const initialIngredients: IngredientDraft[] = (recipe?.ingredients ?? []).map((i) => ({
    name: i.name,
    quantity: i.quantity === null ? '' : String(i.quantity),
    unit: i.unit ?? '',
    category: i.category ?? '',
    note: i.note ?? '',
  }));

  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(errorState, 'title')}>
          <FieldLabel htmlFor="recipe-title">Title</FieldLabel>
          <Input
            id="recipe-title"
            name="title"
            defaultValue={recipe?.title}
            required
            maxLength={160}
            autoFocus
            placeholder="Chicken curry"
          />
          <FieldError errors={fieldErrors(errorState, 'title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field data-invalid={hasFieldError(errorState, 'servings')}>
            <FieldLabel htmlFor="recipe-servings">Servings</FieldLabel>
            <Input
              id="recipe-servings"
              name="servings"
              type="number"
              min={1}
              max={99}
              defaultValue={recipe?.servings ?? 2}
              required
            />
            <FieldError errors={fieldErrors(errorState, 'servings')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="recipe-prep">Prep (min)</FieldLabel>
            <Input
              id="recipe-prep"
              name="prepMinutes"
              type="number"
              min={0}
              defaultValue={recipe?.prepMinutes ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="recipe-cook">Cook (min)</FieldLabel>
            <Input
              id="recipe-cook"
              name="cookMinutes"
              type="number"
              min={0}
              defaultValue={recipe?.cookMinutes ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="recipe-rating">Rating</FieldLabel>
            <NativeSelect id="recipe-rating" name="rating" defaultValue={recipe?.rating ?? ''}>
              <option value="">Not rated</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="recipe-category">Category</FieldLabel>
            <Input
              id="recipe-category"
              name="category"
              defaultValue={recipe?.category ?? ''}
              placeholder="Dinner, Jamaican, soup…"
              maxLength={60}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="recipe-image">Photo</FieldLabel>
            <Input
              id="recipe-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
            />
            {recipe?.imagePath && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox name="removeImage" /> Remove the current photo
              </label>
            )}
            <FieldDescription>JPEG, PNG, WebP or GIF up to 10 MB.</FieldDescription>
          </Field>
        </div>
        <Field>
          <FieldLabel>Dietary tags</FieldLabel>
          <TagPicker initial={recipe?.dietaryTags ?? []} />
        </Field>
        <Field data-invalid={hasFieldError(errorState, 'ingredients')}>
          <FieldLabel>Ingredients</FieldLabel>
          <IngredientEditor initial={initialIngredients} />
          <FieldError errors={fieldErrors(errorState, 'ingredients')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="recipe-instructions">Instructions</FieldLabel>
          <Textarea
            id="recipe-instructions"
            name="instructions"
            rows={6}
            defaultValue={recipe?.instructions ?? ''}
            placeholder="One step per line."
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="recipe-description">Description</FieldLabel>
          <Input
            id="recipe-description"
            name="description"
            defaultValue={recipe?.description ?? ''}
            maxLength={500}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="recipe-notes">Notes</FieldLabel>
          <Textarea id="recipe-notes" name="notes" rows={2} defaultValue={recipe?.notes ?? ''} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isFavourite" defaultChecked={recipe?.isFavourite ?? false} /> Favourite
        </label>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{recipe ? 'Save changes' : 'Create recipe'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
