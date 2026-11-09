import { CakeIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { cn } from '@/lib/utils';
import { deleteRecipientAction } from '../actions';
import { daysUntil, nextAnniversary } from '../grouping';
import type { RecipientRow } from '../queries';
import { RecipientFormDialog } from './recipient-form-dialog';

export function RecipientCard({
  recipient,
  todayKey,
  active,
}: {
  recipient: RecipientRow;
  todayKey: string;
  active: boolean;
}) {
  const next = recipient.birthday ? nextAnniversary(recipient.birthday, todayKey) : null;
  const days = next ? daysUntil(next, todayKey) : null;
  return (
    <Card size="sm" className={cn('h-full', active && 'ring-primary ring-2')}>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <Link
            href={active ? '/gifts' : `/gifts?recipient=${recipient.id}`}
            className="font-heading min-w-0 flex-1 truncate text-base hover:underline"
          >
            {recipient.name}
          </Link>
          <RecipientFormDialog
            recipient={recipient}
            variant="ghost"
            size="icon-xs"
            trigger={
              <>
                <PencilIcon />
                <span className="sr-only">Edit {recipient.name}</span>
              </>
            }
          />
          <ConfirmActionButton
            action={deleteRecipientAction}
            fields={{ id: recipient.id }}
            title={`Remove ${recipient.name}?`}
            description="Their gifts go with them."
            variant="ghost"
            size="icon-xs"
            trigger={
              <>
                <Trash2Icon />
                <span className="sr-only">Remove {recipient.name}</span>
              </>
            }
          />
        </div>
        {recipient.relationship && (
          <p className="text-muted-foreground text-xs">{recipient.relationship}</p>
        )}
        {days !== null && (
          <p
            className={cn(
              'flex items-center gap-1 text-xs',
              days <= 14 ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <CakeIcon className="size-3.5" aria-hidden />
            {days === 0 ? 'Birthday today' : `Birthday in ${days} day${days === 1 ? '' : 's'}`}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {recipient.openCount} open · {recipient.giftCount} total
        </p>
      </CardContent>
    </Card>
  );
}
