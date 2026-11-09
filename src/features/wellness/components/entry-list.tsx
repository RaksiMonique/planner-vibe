import { format, parseISO } from 'date-fns';
import { Trash2Icon } from 'lucide-react';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { removeWellnessEntryAction } from '../actions';
import type { WellnessEntry } from '../queries';

function describe(e: WellnessEntry): string {
  const value = e.value === null ? null : Number(e.value);
  const parts = [
    e.label,
    value !== null ? `${value % 1 === 0 ? value : value.toFixed(1)} ${e.unit ?? ''}`.trim() : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

/** Dated rows with a delete, for any wellness kind. */
export function EntryList({ entries, emptyText }: { entries: WellnessEntry[]; emptyText: string }) {
  if (entries.length === 0) return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground w-16 shrink-0 text-xs">
            {format(parseISO(e.date), 'EEE d MMM')}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {describe(e)}
            {e.note && <span className="text-muted-foreground"> · {e.note}</span>}
          </span>
          <ConfirmActionButton
            action={removeWellnessEntryAction}
            fields={{ id: e.id }}
            title="Delete this entry?"
            trigger={<Trash2Icon aria-label="Delete entry" />}
            variant="ghost"
            size="icon-xs"
          />
        </li>
      ))}
    </ul>
  );
}
