import { ExternalLinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { deleteGiftAction, setGiftStatusAction } from '../actions';
import { formatMoney } from '../grouping';
import type { GiftRecipient, GiftRow as GiftRowData } from '../queries';
import { GIFT_STATUS_LABELS, GIFT_STATUSES } from '../schema';
import { GiftFormDialog } from './gift-form-dialog';

export function GiftRow({
  gift,
  recipients,
  segments,
  currency,
  showRecipient = true,
}: {
  gift: GiftRowData;
  recipients: Pick<GiftRecipient, 'id' | 'name'>[];
  segments: SegmentRef[];
  currency: string;
  showRecipient?: boolean;
}) {
  return (
    <li className="bg-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2">
      <SegmentDot accent={gift.segment.accent} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {gift.title}
          {showRecipient && (
            <span className="text-muted-foreground"> · for {gift.recipient.name}</span>
          )}
        </p>
        <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
          {gift.budget && <span>Budget {formatMoney(gift.budget, currency)}</span>}
          {gift.price && <span>Paid {formatMoney(gift.price, currency)}</span>}
          {gift.url && (
            <a
              href={gift.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              Link <ExternalLinkIcon className="size-3" aria-hidden />
            </a>
          )}
        </p>
      </div>
      <Badge variant={gift.status === 'given' ? 'secondary' : 'outline'}>
        {GIFT_STATUS_LABELS[gift.status]}
      </Badge>
      <form action={setGiftStatusAction} className="flex items-center gap-1">
        <input type="hidden" name="id" value={gift.id} />
        <NativeSelect
          name="status"
          defaultValue={gift.status}
          aria-label={`Status of ${gift.title}`}
          className="h-7 w-auto text-xs"
        >
          {GIFT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {GIFT_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" size="xs" variant="ghost">
          Set
        </Button>
      </form>
      <span className="flex items-center">
        <GiftFormDialog
          gift={gift}
          recipients={recipients}
          segments={segments}
          currency={currency}
          variant="ghost"
          size="icon-xs"
          trigger={
            <>
              <PencilIcon />
              <span className="sr-only">Edit {gift.title}</span>
            </>
          }
        />
        <ConfirmActionButton
          action={deleteGiftAction}
          fields={{ id: gift.id }}
          title={`Delete "${gift.title}"?`}
          variant="ghost"
          size="icon-xs"
          trigger={
            <>
              <Trash2Icon />
              <span className="sr-only">Delete {gift.title}</span>
            </>
          }
        />
      </span>
    </li>
  );
}
