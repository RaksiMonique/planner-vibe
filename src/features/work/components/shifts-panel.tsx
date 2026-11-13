import { format, parseISO } from 'date-fns';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { deleteShiftAction } from '../actions';
import { describeShift, expandShift } from '../availability';
import type { ShiftKindRow, ShiftRow } from '../queries';
import { SHIFT_KIND_LABELS } from '../schema';
import { ShiftFormDialog } from './shift-form-dialog';
import { shiftTimeLabel } from './status';

const day = (key: string, pattern = 'd MMM') => format(parseISO(key), pattern);

function removalCopy(shift: ShiftRow): { title: string; description: string } {
  if (shift.repeatEvery > 0) {
    return {
      title: 'Remove this repeating shift?',
      description: 'Days already past keep it; from today they go back to the pattern.',
    };
  }
  if (shift.endDate) {
    return {
      title: `Remove this shift from ${day(shift.date)} to ${day(shift.endDate)}?`,
      description: 'The pattern takes those days back.',
    };
  }
  return {
    title: `Remove this shift on ${day(shift.date, 'd MMMM')}?`,
    description: 'The pattern takes that date back.',
  };
}

/** Shifts placed by hand that reach into the month on show, each listed once. */
export function ShiftsPanel({
  shifts,
  monthLabel,
  defaultDate,
  kinds,
  from,
  to,
}: {
  shifts: ShiftRow[];
  monthLabel: string;
  defaultDate: string;
  kinds: ShiftKindRow[];
  /** First and last 'yyyy-MM-dd' of the month on show. */
  from: string;
  to: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="items-center">
        <h3 className="font-heading text-lg">Manual shifts</h3>
        <CardAction>
          <ShiftFormDialog
            defaultDate={defaultDate}
            kinds={kinds}
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
              const kindName = s.kindName ?? SHIFT_KIND_LABELS[s.kind];
              const name = s.label || kindName;
              const firstInMonth = expandShift(s, from, to)[0] ?? s.date;
              const schedule = describeShift(s);
              const removal = removalCopy(s);
              return (
                <li
                  key={s.id}
                  className="bg-card flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-2"
                >
                  <span className="text-muted-foreground w-14 shrink-0 text-xs">
                    {day(firstInMonth, 'EEE d')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {time ?? 'All day'}
                      {schedule && ` · ${schedule}`}
                      {s.note && ` · ${s.note}`}
                    </p>
                  </div>
                  <Badge variant={s.kind === 'off' ? 'outline' : 'secondary'}>{kindName}</Badge>
                  <span className="flex items-center">
                    <ShiftFormDialog
                      shift={s}
                      defaultDate={defaultDate}
                      kinds={kinds}
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
                      title={removal.title}
                      description={removal.description}
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
