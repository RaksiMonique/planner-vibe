import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PeriodNav({
  label,
  prevHref,
  nextHref,
  currentHref,
  currentLabel,
  isCurrent,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  currentHref: string;
  currentLabel: string;
  isCurrent: boolean;
}) {
  return (
    <nav aria-label={`${label} navigation`} className="flex flex-wrap items-center gap-2">
      <Link
        href={prevHref}
        aria-label={`Previous ${label.toLowerCase()}`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        <ChevronLeftIcon data-icon="inline-start" />
        Previous
      </Link>
      {!isCurrent && (
        <Link href={currentHref} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          {currentLabel}
        </Link>
      )}
      <Link
        href={nextHref}
        aria-label={`Next ${label.toLowerCase()}`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        Next
        <ChevronRightIcon data-icon="inline-end" />
      </Link>
    </nav>
  );
}
