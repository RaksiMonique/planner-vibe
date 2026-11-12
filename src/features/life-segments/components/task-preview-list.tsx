import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { SegmentDot } from '@/components/shared/segment-badge';
import { BlockedBadge } from '@/features/tasks/components/blocked-badge';
import type { TaskRow } from '@/features/tasks/queries';
import { cn } from '@/lib/utils';

/** Read-only list of tasks for segment, goal and project pages. Editing lives in /tasks. */
export function TaskPreviewList({
  tasks,
  todayKey,
  allHref,
  limit = 10,
  emptyTitle = 'No open tasks',
}: {
  tasks: TaskRow[];
  todayKey: string;
  allHref: string;
  limit?: number;
  emptyTitle?: string;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState title={emptyTitle} description="Tasks you add in Tasks will show up here." />
    );
  }
  const shown = tasks.slice(0, limit);
  return (
    <div className="flex flex-col gap-2">
      <ul className="bg-card divide-y rounded-xl border">
        {shown.map((t) => {
          const overdue = t.dueDate !== null && t.dueDate < todayKey && t.status !== 'done';
          return (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <SegmentDot accent={t.segment.accent} />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  t.status === 'done' && 'text-muted-foreground line-through'
                )}
              >
                {t.title}
              </span>
              {t.status !== 'done' && <BlockedBadge blockedBy={t.blockedBy} />}
              {t.isImportant && <Badge variant="secondary">Important</Badge>}
              {t.dueDate && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    overdue ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {format(parseISO(t.dueDate), 'd MMM')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <Link href={allHref} className={cn(buttonVariants({ variant: 'link', size: 'sm' }))}>
          {tasks.length > limit ? `All ${tasks.length} tasks` : 'Open in Tasks'}
        </Link>
      </div>
    </div>
  );
}
