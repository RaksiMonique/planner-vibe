'use client';

import { useOptimistic, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { cn } from '@/lib/utils';
import { deleteAssignmentAction, setAssignmentDoneAction } from '../actions';
import type { AssignmentRow } from '../queries';

export function AssignmentList({
  assignments,
  todayKey,
  showCourse = true,
}: {
  assignments: AssignmentRow[];
  todayKey: string;
  showCourse?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [rows, setRows] = useOptimistic(
    assignments,
    (current, update: { id: string; done: boolean }) =>
      current.map((a) => (a.id === update.id ? { ...a, done: update.done } : a))
  );

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No assignments.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((a) => {
        const overdue = !a.done && a.dueDate !== null && a.dueDate < todayKey;
        return (
          <li key={a.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm">
            <Checkbox
              checked={a.done}
              onCheckedChange={(checked) =>
                startTransition(async () => {
                  setRows({ id: a.id, done: checked === true });
                  await setAssignmentDoneAction(a.id, checked === true);
                })
              }
              aria-label={`${a.done ? 'Reopen' : 'Complete'} assignment ${a.title}`}
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                a.done && 'text-muted-foreground line-through'
              )}
            >
              {a.title}
              {showCourse && a.courseTitle && (
                <span className="text-muted-foreground"> · {a.courseTitle}</span>
              )}
            </span>
            {a.dueDate && (
              <span
                className={cn('text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}
              >
                {overdue ? 'Overdue · ' : ''}
                {format(parseISO(a.dueDate), 'd MMM')}
              </span>
            )}
            <ConfirmActionButton
              action={deleteAssignmentAction}
              fields={{ id: a.id }}
              title="Delete this assignment?"
              description="Its mirrored task is removed too."
              variant="ghost"
              size="icon-xs"
              trigger={
                <>
                  <Trash2Icon />
                  <span className="sr-only">Delete assignment</span>
                </>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
