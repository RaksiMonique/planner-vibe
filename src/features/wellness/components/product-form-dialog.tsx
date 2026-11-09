'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createProductAction, updateProductAction } from '../actions';
import type { Product } from '../queries';
import { PRODUCT_CATEGORIES } from '../schema';

export function ProductFormDialog({
  product,
  currency,
  trigger,
  variant = 'default',
  size = 'sm',
  defaults,
}: {
  product?: Product;
  currency: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  /** Flags preselected for a new product, for the section's "add" button. */
  defaults?: Partial<Pick<Product, 'inInventory' | 'isFavourite' | 'onWishlist'>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {product ? 'Edit product' : 'New product'}
          </DialogTitle>
          <DialogDescription>
            Skincare, haircare and body products you own, love or want.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          product={product}
          currency={currency}
          defaults={defaults}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({
  product,
  currency,
  defaults,
  onDone,
}: {
  product?: Product;
  currency: string;
  defaults?: Partial<Pick<Product, 'inInventory' | 'isFavourite' | 'onWishlist'>>;
  onDone: () => void;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );
  const flags = {
    inInventory: product?.inInventory ?? defaults?.inInventory ?? true,
    isFavourite: product?.isFavourite ?? defaults?.isFavourite ?? false,
    onWishlist: product?.onWishlist ?? defaults?.onWishlist ?? false,
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="product-name">Name</FieldLabel>
          <Input
            id="product-name"
            name="name"
            required
            maxLength={120}
            autoFocus
            defaultValue={product?.name}
            placeholder="Hydrating serum"
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="product-brand">Brand</FieldLabel>
            <Input
              id="product-brand"
              name="brand"
              maxLength={80}
              defaultValue={product?.brand ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="product-category">Category</FieldLabel>
            <NativeSelect
              id="product-category"
              name="category"
              defaultValue={product?.category ?? 'Skincare'}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field>
          <FieldLabel>Where it belongs</FieldLabel>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox name="inInventory" defaultChecked={flags.inInventory} /> In my inventory
            </label>
            <label className="flex items-center gap-2">
              <Checkbox name="isFavourite" defaultChecked={flags.isFavourite} /> Favourite
            </label>
            <label className="flex items-center gap-2">
              <Checkbox name="onWishlist" defaultChecked={flags.onWishlist} /> Wishlist
            </label>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'price')}>
            <FieldLabel htmlFor="product-price">Price ({currency})</FieldLabel>
            <Input
              id="product-price"
              name="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              defaultValue={product?.price ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'price')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'url')}>
            <FieldLabel htmlFor="product-url">Link</FieldLabel>
            <Input
              id="product-url"
              name="url"
              type="url"
              placeholder="https://"
              defaultValue={product?.url ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'url')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="product-opened">Opened on</FieldLabel>
            <Input
              id="product-opened"
              name="openedOn"
              type="date"
              defaultValue={product?.openedOn ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="product-expires">Use by</FieldLabel>
            <Input
              id="product-expires"
              name="expiresOn"
              type="date"
              defaultValue={product?.expiresOn ?? ''}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="product-image">Photo</FieldLabel>
          <Input
            id="product-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
          />
          <FieldDescription>
            {product?.imagePath
              ? 'Choose a file to replace the current photo.'
              : 'Optional, up to 10 MB.'}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="product-notes">Notes</FieldLabel>
          <Textarea
            id="product-notes"
            name="notes"
            rows={2}
            maxLength={2000}
            defaultValue={product?.notes ?? ''}
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
        <SubmitButton>{product ? 'Save changes' : 'Add product'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
