import { format, parseISO } from 'date-fns';
import { CarFrontIcon, PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { cn } from '@/lib/utils';
import { deleteDocumentAction, deleteVehicleAction } from '../actions';
import type { VehicleRow } from '../queries';
import {
  documentStatus,
  orderKinds,
  STANDARD_DOCUMENT_KINDS,
  vehicleLabel,
  type DocumentState,
} from '../status';
import { DocumentFormDialog } from './document-form-dialog';
import { VehicleFormDialog } from './vehicle-form-dialog';

export const STATE_CLASS: Record<DocumentState, string> = {
  expired: 'bg-destructive/10 text-destructive border-transparent',
  due: 'bg-gold/25 text-foreground border-transparent',
  ok: 'bg-muted text-muted-foreground border-transparent',
};

export function VehicleCard({
  vehicle,
  segments,
  todayKey,
}: {
  vehicle: VehicleRow;
  segments: SegmentRef[];
  todayKey: string;
}) {
  const label = vehicleLabel(vehicle);
  const details = [
    vehicle.colour,
    vehicle.name ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') : null,
    vehicle.licensePlate,
  ].filter(Boolean);
  const kinds = orderKinds([...STANDARD_DOCUMENT_KINDS, ...vehicle.documents.map((d) => d.kind)]);

  return (
    <Card data-slot="vehicle-card">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <CarFrontIcon className="text-primary mt-1 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading truncate text-lg leading-snug">{label}</h3>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <SegmentDot accent={vehicle.segment.accent} className="size-2" />
              <span className="truncate">{details.join(' · ') || vehicle.segment.name}</span>
            </p>
          </div>
          <VehicleFormDialog
            segments={segments}
            vehicle={vehicle}
            variant="ghost"
            size="icon-xs"
            trigger={<PencilIcon aria-label={`Edit ${label}`} />}
          />
          <ConfirmActionButton
            action={deleteVehicleAction}
            fields={{ id: vehicle.id }}
            title={`Remove ${label}?`}
            description="Its papers and their reminders go with it."
            trigger={<Trash2Icon aria-label={`Remove ${label}`} />}
            variant="ghost"
            size="icon-xs"
          />
        </div>

        <ul className="flex flex-col divide-y" aria-label={`${label} documents`}>
          {kinds.map((kind) => {
            const doc = vehicle.documents.find((d) => d.kind === kind);
            if (!doc) {
              return (
                <li
                  key={kind}
                  className="flex items-center gap-2 py-1.5 text-sm"
                  data-slot="document-row"
                >
                  <span className="min-w-0 flex-1 truncate">{kind}</span>
                  <span className="text-muted-foreground text-xs">Not set</span>
                  <DocumentFormDialog
                    vehicleId={vehicle.id}
                    vehicleName={label}
                    defaultKind={kind}
                    variant="ghost"
                    size="icon-xs"
                    trigger={<PlusIcon aria-label={`Add ${kind} for ${label}`} />}
                  />
                </li>
              );
            }
            const status = documentStatus(doc.expiresOn, todayKey);
            const renewing = status.state !== 'ok';
            return (
              <li
                key={kind}
                className="flex items-center gap-2 py-1.5 text-sm"
                data-slot="document-row"
                data-state={status.state}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-baseline gap-1">
                    <span className="truncate">{kind}</span>
                    {doc.reference && (
                      <span className="text-muted-foreground min-w-0 truncate text-xs">
                        · {doc.reference}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {format(parseISO(doc.expiresOn), 'd MMM yyyy')}
                    {doc.notes && ` · ${doc.notes}`}
                  </p>
                </div>
                {renewing && (
                  <Badge variant="outline" className={cn('shrink-0', STATE_CLASS[status.state])}>
                    {status.wording}
                  </Badge>
                )}
                <DocumentFormDialog
                  vehicleId={vehicle.id}
                  vehicleName={label}
                  document={doc}
                  renewing={renewing}
                  variant={renewing ? 'outline' : 'ghost'}
                  size={renewing ? 'xs' : 'icon-xs'}
                  trigger={
                    renewing ? (
                      <>
                        <RefreshCwIcon data-icon="inline-start" />
                        Renew
                      </>
                    ) : (
                      <PencilIcon aria-label={`Edit ${kind} for ${label}`} />
                    )
                  }
                />
                <ConfirmActionButton
                  action={deleteDocumentAction}
                  fields={{ id: doc.id }}
                  title={`Remove ${kind} for ${label}?`}
                  trigger={<Trash2Icon aria-label={`Remove ${kind} for ${label}`} />}
                  variant="ghost"
                  size="icon-xs"
                />
              </li>
            );
          })}
        </ul>

        <DocumentFormDialog
          vehicleId={vehicle.id}
          vehicleName={label}
          variant="outline"
          size="sm"
          trigger={
            <>
              <PlusIcon data-icon="inline-start" />
              Other document
            </>
          }
        />
        {vehicle.notes && (
          <p className="text-muted-foreground text-xs whitespace-pre-line">{vehicle.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
