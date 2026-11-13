import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { deleteShiftKindAction } from '../actions';
import type { ShiftKindRow } from '../queries';
import { SHIFT_KIND_LABELS } from '../schema';
import { ShiftKindFormDialog } from './shift-kind-form-dialog';

/** The user's own kinds of shift, beside the built-in Work, On call and Off. */
export function ShiftKindsPanel({ kinds }: { kinds: ShiftKindRow[] }) {
  return (
    <Card size="sm">
      <CardHeader className="items-center">
        <h3 className="font-heading text-lg">Shift kinds</h3>
        <CardAction>
          <ShiftKindFormDialog
            variant="outline"
            size="xs"
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                New kind
              </>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {kinds.length === 0 ? (
          <EmptyNote>
            Work, On call and Off are built in. Add your own, such as Night or Training, here or
            from the shift form.
          </EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {kinds.map((k) => (
              <li
                key={k.id}
                className="bg-card flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-2"
              >
                <SegmentDot accent={k.accent} />
                <p className="min-w-0 flex-1 truncate text-sm">{k.name}</p>
                <Badge variant={k.countsAs === 'off' ? 'outline' : 'secondary'}>
                  {SHIFT_KIND_LABELS[k.countsAs]}
                </Badge>
                <span className="flex items-center">
                  <ShiftKindFormDialog
                    kind={k}
                    variant="ghost"
                    size="icon-xs"
                    trigger={
                      <>
                        <PencilIcon />
                        <span className="sr-only">Edit {k.name}</span>
                      </>
                    }
                  />
                  <ConfirmActionButton
                    action={deleteShiftKindAction}
                    fields={{ id: k.id }}
                    title={`Remove the ${k.name} kind?`}
                    description={`Its shifts keep their days and count as ${SHIFT_KIND_LABELS[k.countsAs].toLowerCase()}.`}
                    confirmLabel="Remove"
                    variant="ghost"
                    size="icon-xs"
                    trigger={
                      <>
                        <Trash2Icon />
                        <span className="sr-only">Remove {k.name}</span>
                      </>
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
