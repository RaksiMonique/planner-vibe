import { PencilIcon, ShieldIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { removeRecordAction } from '../actions';
import { fieldsForKind } from '../kinds';
import type { ImportantRecord } from '../queries';
import { RecordFormDialog } from './record-form-dialog';

export function RecordCard({ record }: { record: ImportantRecord }) {
  const defs = fieldsForKind(record.kind).filter((d) => record.fields[d.key]);
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm font-medium">{record.title}</p>
          {record.isSensitive && (
            <Badge variant="outline" title="Kept out of exports">
              <ShieldIcon aria-hidden /> Sensitive
            </Badge>
          )}
          <RecordFormDialog
            record={record}
            variant="ghost"
            size="icon-xs"
            trigger={<PencilIcon aria-label={`Edit ${record.title}`} />}
          />
          <ConfirmActionButton
            action={removeRecordAction}
            fields={{ id: record.id }}
            title={`Delete ${record.title}?`}
            trigger={<Trash2Icon aria-label={`Delete ${record.title}`} />}
            variant="ghost"
            size="icon-xs"
          />
        </div>
        {defs.length > 0 && (
          <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            {defs.map((d) => (
              <div key={d.key} className="contents">
                <dt className="text-muted-foreground text-xs sm:pt-0.5">{d.label}</dt>
                <dd className="break-words whitespace-pre-line">
                  {d.type === 'url' ? (
                    <a
                      href={record.fields[d.key]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {record.fields[d.key]}
                    </a>
                  ) : d.type === 'tel' ? (
                    <a
                      href={`tel:${record.fields[d.key]}`}
                      className="text-primary hover:underline"
                    >
                      {record.fields[d.key]}
                    </a>
                  ) : (
                    record.fields[d.key]
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {record.notes && (
          <p className="text-muted-foreground text-xs whitespace-pre-line">{record.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
