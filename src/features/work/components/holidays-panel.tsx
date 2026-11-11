import { format, parseISO } from 'date-fns';
import { Trash2Icon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { deleteHolidayAction } from '../actions';
import type { PublicHoliday } from '../queries';
import { HolidayForm } from './holiday-form';

/** Public holidays entered by hand; each one takes its date out of the schedule. */
export function HolidaysPanel({
  holidays,
  defaultDate,
}: {
  holidays: PublicHoliday[];
  defaultDate: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <h3 className="font-heading text-lg">Public holidays</h3>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <HolidayForm defaultDate={defaultDate} />
        {holidays.length === 0 ? (
          <EmptyNote>No holidays listed yet.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="bg-card flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
              >
                <span className="text-muted-foreground w-20 shrink-0 text-xs">
                  {format(parseISO(h.date), 'EEE d MMM')}
                </span>
                <span className="min-w-0 flex-1 truncate">{h.name}</span>
                <ConfirmActionButton
                  action={deleteHolidayAction}
                  fields={{ id: h.id }}
                  title={`Remove ${h.name}?`}
                  confirmLabel="Remove"
                  variant="ghost"
                  size="icon-xs"
                  trigger={
                    <>
                      <Trash2Icon />
                      <span className="sr-only">Remove {h.name}</span>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
