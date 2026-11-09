import { StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RatingStars({ rating, className }: { rating: number | null; className?: string }) {
  if (!rating) return null;
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${rating} of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          className={cn('size-3.5', n <= rating ? 'fill-terracotta text-terracotta' : 'text-beige')}
          aria-hidden
        />
      ))}
    </span>
  );
}
