'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { RepeatIcon, ListTreeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { DueStatus } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { toggleTaskDoneAction } from '../actions';
import type { TaskRow as TaskRowData } from '../queries';
import { BlockedBadge } from './blocked-badge';
import { BlockedConfirm } from './blocked-confirm';
import { DueChip } from './due-chip';

export function TaskRow({
  task,
  status,
  editHref,
  subtaskCount = 0,
  compact = false,
}: {
  task: TaskRowData;
  status: DueStatus;
  /** Where the title links; usually `?task=<id>` with the current params kept. */
  editHref: string;
  subtaskCount?: number;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const done = task.status === 'done';
  const blocked = !done && task.blockedBy.length > 0;

  function setDone(checked: boolean) {
    start(async () => {
      const result = await toggleTaskDoneAction(task.id, checked);
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <div
      className={cn(
        'hover:bg-muted/60 flex items-center gap-2.5 rounded-lg px-1.5 py-1',
        pending && 'opacity-60'
      )}
    >
      <Checkbox
        checked={done}
        disabled={pending}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        onCheckedChange={(checked) => {
          if (checked === true && blocked) setConfirming(true);
          else setDone(checked === true);
        }}
      />
      {blocked && (
        <BlockedConfirm
          open={confirming}
          onOpenChange={setConfirming}
          blockedBy={task.blockedBy}
          onConfirm={() => {
            setConfirming(false);
            setDone(true);
          }}
        />
      )}
      <SegmentDot accent={task.segment.accent} />
      <Link
        href={editHref}
        className={cn(
          'min-w-0 flex-1 truncate text-sm hover:underline',
          done && 'text-muted-foreground line-through'
        )}
        title={task.title}
      >
        {task.title}
      </Link>
      {error && <span className="text-destructive text-xs">{error}</span>}
      {task.rrule && <RepeatIcon className="text-muted-foreground size-3.5" aria-label="Repeats" />}
      {subtaskCount > 0 && (
        <span className="text-muted-foreground hidden items-center gap-0.5 text-xs sm:inline-flex">
          <ListTreeIcon className="size-3.5" aria-hidden /> {subtaskCount}
        </span>
      )}
      {blocked && <BlockedBadge blockedBy={task.blockedBy} />}
      {task.isImportant && !compact && (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Important
        </Badge>
      )}
      {!done && <DueChip dueDate={task.dueDate} status={status} />}
      {!compact && (
        <span className="text-muted-foreground hidden text-xs lg:inline">{task.segment.name}</span>
      )}
    </div>
  );
}
