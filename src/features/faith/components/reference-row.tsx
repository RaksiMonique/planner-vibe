import { BookmarkIcon, HeartIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { deleteReferenceAction, setReferenceFlagAction } from '../actions';
import type { ScriptureReference } from '../queries';

/** A saved passage with favourite and bookmark toggles. Server component; each control is a tiny form. */
export function ReferenceRow({ reference }: { reference: ScriptureReference }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{reference.label}</p>
        {reference.note && <p className="text-muted-foreground text-xs">{reference.note}</p>}
      </div>
      <FlagButton
        reference={reference}
        flag="isFavourite"
        on={reference.isFavourite}
        icon={<HeartIcon className={cn('size-3.5', reference.isFavourite && 'fill-current')} />}
        label={reference.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
      />
      <FlagButton
        reference={reference}
        flag="isBookmark"
        on={reference.isBookmark}
        icon={<BookmarkIcon className={cn('size-3.5', reference.isBookmark && 'fill-current')} />}
        label={reference.isBookmark ? 'Remove bookmark' : 'Bookmark'}
      />
      <form action={deleteReferenceAction}>
        <input type="hidden" name="id" value={reference.id} />
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          aria-label={`Delete ${reference.label}`}
        >
          <Trash2Icon />
        </Button>
      </form>
    </li>
  );
}

function FlagButton({
  reference,
  flag,
  on,
  icon,
  label,
}: {
  reference: ScriptureReference;
  flag: 'isFavourite' | 'isBookmark';
  on: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <form action={setReferenceFlagAction}>
      <input type="hidden" name="id" value={reference.id} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={on ? '' : 'on'} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-xs"
        aria-pressed={on}
        aria-label={label}
        className={cn(on && 'text-primary')}
      >
        {icon}
      </Button>
    </form>
  );
}
