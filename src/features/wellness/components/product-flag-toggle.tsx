'use client';

import { useState, useTransition } from 'react';
import { HeartIcon, PackageIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setProductFlagAction } from '../actions';

type Flag = 'inInventory' | 'isFavourite' | 'onWishlist';
const META: Record<Flag, { on: string; off: string; icon: typeof HeartIcon }> = {
  inInventory: { on: 'In inventory', off: 'Add to inventory', icon: PackageIcon },
  isFavourite: { on: 'Favourite', off: 'Mark as favourite', icon: HeartIcon },
  onWishlist: { on: 'On wishlist', off: 'Add to wishlist', icon: SparklesIcon },
};

export function ProductFlagToggle({ id, flag, value }: { id: string; flag: Flag; value: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const on = optimistic ?? value;
  const Icon = META[flag].icon;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? META[flag].on : META[flag].off}
      title={on ? META[flag].on : META[flag].off}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOptimistic(next);
        start(async () => {
          const result = await setProductFlagAction(id, flag, next);
          if (!result.ok) setOptimistic(null);
        });
      }}
      className={cn(
        'flex size-7 items-center justify-center rounded-full border transition-colors',
        on
          ? 'bg-secondary text-secondary-foreground border-transparent'
          : 'bg-card text-muted-foreground hover:bg-muted',
        pending && 'opacity-60'
      )}
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}
