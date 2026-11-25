import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { CarFrontIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import type { WeekStartsOn } from '@/lib/dates';
import { toDateKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listExpiringDocuments } from '../queries';
import { documentStatus, vehicleLabel } from '../status';
import { STATE_CLASS } from './vehicle-card';

const PREVIEW = 5;
const HORIZON_DAYS = 90;

/** Vehicle papers already expired or expiring in the next three months, soonest first. */
export async function VehiclesDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const untilKey = toDateKey(addDays(parseISO(todayKey), HORIZON_DAYS));
  const items = await listExpiringDocuments(userId, untilKey);
  const shown = items.slice(0, PREVIEW);
  const more = items.length - shown.length;

  return (
    <DashboardCard title="Vehicle papers" icon={CarFrontIcon} href="/vehicles" release={6}>
      {items.length === 0 ? (
        <EmptyNote>
          Nothing to renew in the next three months.{' '}
          <Link href="/vehicles" className="text-primary link">
            See the vehicles.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {shown.map(({ document, vehicle }) => {
              const status = documentStatus(document.expiresOn, todayKey);
              return (
                <li key={document.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
                    {format(parseISO(document.expiresOn), 'd MMM')}
                  </span>
                  <Link href="/vehicles" className="link min-w-0 flex-1 truncate">
                    {document.kind} · {vehicleLabel(vehicle)}
                  </Link>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-xs',
                      STATE_CLASS[status.state]
                    )}
                  >
                    {status.wording}
                  </span>
                </li>
              );
            })}
          </ul>
          {more > 0 && (
            <Link href="/vehicles" className="text-primary link text-xs">
              {more} more on the Vehicles page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
