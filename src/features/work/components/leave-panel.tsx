import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { deleteLeaveAction } from '../actions';
import type { LeavePeriod } from '../queries';
import { LEAVE_KIND_LABELS, LEAVE_STATUS_LABELS } from '../schema';
import { LeaveFormDialog } from './leave-form-dialog';

function rangeLabel(start: string, end: string): string {
  const s = parseISO(start);
  const e = parseISO(end);
  if (start === end) return format(s, 'EEE d MMM yyyy');
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${format(s, sameMonth ? 'd' : 'd MMM')} – ${format(e, 'd MMM yyyy')}`;
}

/** Current and upcoming leave. */
export function LeavePanel({ leave, defaultDate }: { leave: LeavePeriod[]; defaultDate: string }) {
  return (
    <Card size="sm">
      <CardHeader className="items-center">
        <h3 className="font-heading text-lg">Leave</h3>
        <CardAction>
          <LeaveFormDialog
            defaultDate={defaultDate}
            variant="outline"
            size="xs"
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                Add leave
              </>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {leave.length === 0 ? (
          <EmptyNote>No leave coming up.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {leave.map((l) => {
              const days = differenceInCalendarDays(parseISO(l.endDate), parseISO(l.startDate)) + 1;
              const name = LEAVE_KIND_LABELS[l.kind];
              return (
                <li
                  key={l.id}
                  className="bg-card flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {name}
                      <span className="text-muted-foreground">
                        {' '}
                        · {days} day{days === 1 ? '' : 's'}
                      </span>
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {rangeLabel(l.startDate, l.endDate)}
                      {l.note && ` · ${l.note}`}
                    </p>
                  </div>
                  <Badge variant={l.status === 'taken' ? 'secondary' : 'outline'}>
                    {LEAVE_STATUS_LABELS[l.status]}
                  </Badge>
                  <span className="flex items-center">
                    <LeaveFormDialog
                      leave={l}
                      defaultDate={defaultDate}
                      variant="ghost"
                      size="icon-xs"
                      trigger={
                        <>
                          <PencilIcon />
                          <span className="sr-only">Edit {name}</span>
                        </>
                      }
                    />
                    <ConfirmActionButton
                      action={deleteLeaveAction}
                      fields={{ id: l.id }}
                      title={`Remove this ${name.toLowerCase()}?`}
                      description="Those days go back to the schedule."
                      confirmLabel="Remove"
                      variant="ghost"
                      size="icon-xs"
                      trigger={
                        <>
                          <Trash2Icon />
                          <span className="sr-only">Remove {name}</span>
                        </>
                      }
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
