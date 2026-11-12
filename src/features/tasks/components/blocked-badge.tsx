import { LockIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { blockedLabel, type Blocker } from '../dependencies';

/** "Blocked" with the blocking tasks in the tooltip; nothing when the task is ready. */
export function BlockedBadge({
  blockedBy,
  className,
}: {
  blockedBy: Blocker[];
  className?: string;
}) {
  if (blockedBy.length === 0) return null;
  const label = blockedLabel(blockedBy);
  return (
    <Badge variant="outline" className={cn('gap-1 whitespace-nowrap', className)} title={label}>
      <LockIcon className="size-3" aria-hidden />
      <span className="sr-only sm:not-sr-only">Blocked</span>
    </Badge>
  );
}
