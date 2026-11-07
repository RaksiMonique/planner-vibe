'use client';

import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Progress bar safe to use from server components. Base UI's ProgressValue
 * takes a render function, which cannot cross the server/client boundary,
 * so this client component owns it.
 */
export function ProgressBar({
  value,
  label,
  valueText,
  className,
  valueClassName,
}: {
  value: number;
  label?: string;
  valueText?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Progress value={value} className={cn('gap-1', className)}>
      {label && <ProgressLabel>{label}</ProgressLabel>}
      <ProgressValue className={cn('ml-0 text-xs', valueClassName)}>
        {() => valueText ?? `${value}%`}
      </ProgressValue>
    </Progress>
  );
}
