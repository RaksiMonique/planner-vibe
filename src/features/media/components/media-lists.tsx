'use client';

import { useActionState } from 'react';
import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { createMediaListAction, deleteMediaListAction, removeFromListAction } from '../actions';
import type { MediaListRow } from '../queries';

export function MediaLists({ lists }: { lists: MediaListRow[] }) {
  const [state, formAction] = useActionState(createMediaListAction, null);
  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            name="name"
            placeholder="New list, e.g. Lent reading"
            aria-label="List name"
            required
            maxLength={80}
          />
        </div>
        <SubmitButton size="sm" variant="outline" pendingLabel="Creating…">
          <PlusIcon data-icon="inline-start" />
          Create list
        </SubmitButton>
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {lists.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No lists yet. Add items to a list from their cards.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lists.map((l) => (
            <li key={l.id} className="bg-card rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="font-heading flex-1 text-base">{l.name}</span>
                <span className="text-muted-foreground text-xs">{l.items.length}</span>
                <ConfirmActionButton
                  action={deleteMediaListAction}
                  fields={{ id: l.id }}
                  title={`Delete the list "${l.name}"?`}
                  description="The items stay in your library."
                  variant="ghost"
                  size="icon-xs"
                  trigger={
                    <>
                      <Trash2Icon />
                      <span className="sr-only">Delete list</span>
                    </>
                  }
                />
              </div>
              {l.items.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {l.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {item.title}
                        {item.creator && (
                          <span className="text-muted-foreground"> · {item.creator}</span>
                        )}
                      </span>
                      <form action={removeFromListAction}>
                        <input type="hidden" name="listId" value={l.id} />
                        <input type="hidden" name="mediaItemId" value={item.id} />
                        <Button
                          type="submit"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Remove ${item.title} from ${l.name}`}
                        >
                          <XIcon />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
