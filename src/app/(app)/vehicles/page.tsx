import type { Metadata } from 'next';
import { CarFrontIcon, PlusIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { VehicleCard } from '@/features/vehicles/components/vehicle-card';
import { VehicleFormDialog } from '@/features/vehicles/components/vehicle-form-dialog';
import { listVehicles } from '@/features/vehicles/queries';
import { documentStatus, WARN_DAYS } from '@/features/vehicles/status';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Vehicles' };
export const dynamic = 'force-dynamic';

export default async function VehiclesPage() {
  const user = await requireUser();
  const [segments, prefs, vehicles] = await Promise.all([
    listSegments(user.id),
    getPreferences(user.id),
    listVehicles(user.id),
  ]);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const statuses = vehicles.flatMap((v) =>
    v.documents.map((d) => documentStatus(d.expiresOn, todayKey).state)
  );
  const expired = statuses.filter((s) => s === 'expired').length;
  const due = statuses.filter((s) => s === 'due').length;

  const newDialog = (
    <VehicleFormDialog
      segments={segments}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          New vehicle
        </>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Vehicles"
        description={`Each vehicle and the dates its papers run out: insurance, fitness, registration, service and anything else. A document counts as due ${WARN_DAYS} days before it expires, and reminders go out a month before, a week before and on the day.`}
        actions={newDialog}
      />
      {vehicles.length === 0 ? (
        <EmptyState
          icon={CarFrontIcon}
          title="No vehicles yet"
          description="Add a vehicle, then set the date on each of its papers."
          action={newDialog}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p
            data-slot="vehicle-summary"
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              expired > 0
                ? 'bg-destructive/10 text-destructive'
                : due > 0
                  ? 'bg-gold/25 text-foreground'
                  : 'bg-secondary text-secondary-foreground'
            )}
          >
            {expired === 0 && due === 0
              ? 'Everything is in date.'
              : [
                  expired > 0 && `${expired} expired`,
                  due > 0 && `${due} due within ${WARN_DAYS} days`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} segments={segments} todayKey={todayKey} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
