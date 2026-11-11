import { format, parseISO } from 'date-fns';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { deleteShiftAction } from '../actions';
import type { Shift } from '../queries';
import { SHIFT_KIND_LABELS } from '../schema';
import { ShiftFormDialog } from './shift-form-dialog';
import { shiftTimeLabel } from './status';

/** Shifts placed by hand in the month on show. */
export function ShiftsPanel({
  shifts,
  monthLabel,
  defaultDate,
}: {
  shifts: Shift[];
  monthLabel: string;
  defaultDate: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="items-center">
        <h3 className="font-heading text-lg">Manual shifts</h3>
        <CardAction>
          <ShiftFormDialog
            defaultDate={defaultDate}
            variant="outline"
            size="xs"
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                Add shift
              </>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <EmptyNote>Nothing placed by hand in {monthLabel}.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {shifts.map((s) => {
              const time = shiftTimeLabel({
                start: s.startTime?.slice(0, 5),
                end: s.endTime?.slice(0, 5),
              });
              const name = s.label || SHIFT_KIND_LABELS[s.kind];
              return (
                <li
                  key={s.id}
                  className="bg-card flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-2"
                >
                  <span className="text-muted-foreground w-14 shrink-0 text-xs">
                    {format(parseISO(s.date), 'EEE d')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {time ?? 'All day'}
                      {s.note && ` · ${s.note}`}
                    </p>
                  </div>
                  <Badge variant={s.kind === 'off' ? 'outline' : 'secondary'}>
                    {SHIFT_KIND_LABELS[s.kind]}
                  </Badge>
                  <span className="flex items-center">
                    <ShiftFormDialog
                      shift={s}
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
                      action={deleteShiftAction}
                      fields={{ id: s.id }}
                      title={`Remove this shift on ${format(parseISO(s.date), 'd MMMM')}?`}
                      description="The pattern takes that date back."
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
