'use client';

import { useActionState, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  PencilIcon,
  QuoteIcon,
  Trash2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { deleteItemAction, moveItemAction, updateCaptionAction } from '../actions';
import type { ItemRow } from '../queries';

export function ItemCard({
  item,
  isFirst,
  isLast,
}: {
  item: ItemRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(
    async (prev: Parameters<typeof updateCaptionAction>[0], fd: FormData) => {
      const result = await updateCaptionAction(prev, fd);
      if (result.ok) setEditing(false);
      return result;
    },
    null
  );

  return (
    <figure className="bg-card mb-3 break-inside-avoid overflow-hidden rounded-xl border">
      {item.kind === 'image' &&
        (item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.caption ?? ''} className="w-full object-cover" />
        ) : (
          <div className="bg-blush text-muted-foreground flex h-32 items-center justify-center text-xs">
            Image unavailable
          </div>
        ))}
      {item.kind === 'quote' && (
        <blockquote className="bg-secondary text-secondary-foreground flex flex-col gap-2 p-4">
          <QuoteIcon className="text-primary size-4" aria-hidden />
          <p className="font-heading text-lg leading-snug">{item.quoteText}</p>
          {item.author && <footer className="text-muted-foreground text-xs">{item.author}</footer>}
        </blockquote>
      )}
      {item.kind === 'link' && item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary flex items-center gap-2 p-4 text-sm hover:underline"
        >
          <ExternalLinkIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{item.caption || item.url}</span>
        </a>
      )}
      <figcaption className="flex flex-col gap-1.5 px-3 py-2">
        {editing ? (
          <form action={formAction} className="flex gap-1.5">
            <input type="hidden" name="id" value={item.id} />
            <Input
              name="caption"
              defaultValue={item.caption ?? ''}
              maxLength={300}
              aria-label="Caption"
              autoFocus
            />
            <SubmitButton size="xs" pendingLabel="…">
              Save
            </SubmitButton>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          item.kind !== 'link' && (
            <p className="text-muted-foreground text-xs">
              {item.caption ?? <span className="italic">No caption</span>}
            </p>
          )
        )}
        {state && !state.ok && (
          <p role="alert" className="text-destructive text-xs">
            {state.error}
          </p>
        )}
        <div className="flex items-center gap-0.5">
          <form action={moveItemAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="direction" value="left" />
            <Button
              type="submit"
              size="icon-xs"
              variant="ghost"
              disabled={isFirst}
              aria-label="Move earlier"
            >
              <ArrowLeftIcon />
            </Button>
          </form>
          <form action={moveItemAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="direction" value="right" />
            <Button
              type="submit"
              size="icon-xs"
              variant="ghost"
              disabled={isLast}
              aria-label="Move later"
            >
              <ArrowRightIcon />
            </Button>
          </form>
          <span className="ml-auto flex items-center">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Edit caption"
              onClick={() => setEditing((v) => !v)}
            >
              <PencilIcon />
            </Button>
            <ConfirmActionButton
              action={deleteItemAction}
              fields={{ id: item.id }}
              title="Remove this item?"
              description={
                item.kind === 'image' ? 'The image is deleted from storage too.' : undefined
              }
              variant="ghost"
              size="icon-xs"
              trigger={
                <>
                  <Trash2Icon />
                  <span className="sr-only">Remove item</span>
                </>
              }
            />
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
