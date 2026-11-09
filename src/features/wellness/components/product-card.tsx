import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { removeProductAction } from '../actions';
import type { Product } from '../queries';
import { ProductFlagToggle } from './product-flag-toggle';
import { ProductFormDialog } from './product-form-dialog';

export function formatPrice(price: string | null, currency: string): string | null {
  if (price === null) return null;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(price));
  } catch {
    return `${Number(price).toFixed(2)} ${currency}`;
  }
}

export function ProductCard({
  product,
  imageUrl,
  currency,
  showImage = false,
}: {
  product: Product;
  imageUrl: string | null;
  currency: string;
  showImage?: boolean;
}) {
  const price = formatPrice(product.price, currency);
  return (
    <Card size="sm" className="h-full">
      {showImage && (
        <div className="bg-muted aspect-square w-full overflow-hidden">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={product.name} className="size-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
              No photo
            </div>
          )}
        </div>
      )}
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          {!showImage && imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {[product.brand, product.category].filter(Boolean).join(' · ') || 'Uncategorised'}
            </p>
          </div>
          {price && <span className="text-sm tabular-nums">{price}</span>}
        </div>
        {(product.openedOn || product.expiresOn) && (
          <p className="text-muted-foreground text-xs">
            {product.openedOn && `Opened ${product.openedOn}`}
            {product.openedOn && product.expiresOn && ' · '}
            {product.expiresOn && `Use by ${product.expiresOn}`}
          </p>
        )}
        {product.notes && (
          <p className="text-muted-foreground line-clamp-2 text-xs">{product.notes}</p>
        )}
        <div className="flex items-center gap-1.5">
          <ProductFlagToggle id={product.id} flag="inInventory" value={product.inInventory} />
          <ProductFlagToggle id={product.id} flag="isFavourite" value={product.isFavourite} />
          <ProductFlagToggle id={product.id} flag="onWishlist" value={product.onWishlist} />
          <span className="flex-1" />
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-xs hover:underline"
            >
              Link
            </a>
          )}
          <ProductFormDialog
            product={product}
            currency={currency}
            variant="ghost"
            size="icon-xs"
            trigger={<PencilIcon aria-label={`Edit ${product.name}`} />}
          />
          <ConfirmActionButton
            action={removeProductAction}
            fields={{ id: product.id }}
            title={`Delete ${product.name}?`}
            description="Its photo is removed too."
            trigger={<Trash2Icon aria-label={`Delete ${product.name}`} />}
            variant="ghost"
            size="icon-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}
