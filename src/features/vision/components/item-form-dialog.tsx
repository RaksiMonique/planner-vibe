'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { DialogShell } from '@/features/gifts/components/dialog-shell';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import { addItemAction } from '../actions';
import { ITEM_KINDS, type VisionItemKind } from '../schema';
import type { LinkOption } from './board-form-dialog';

const KIND_LABELS: Record<VisionItemKind, string> = {
  image: 'Image',
  quote: 'Quote',
  link: 'Link',
};

export function ItemFormDialog({
  boardId,
  goals,
  projects,
  trigger,
  variant,
  size,
}: {
  boardId: string;
  goals: LinkOption[];
  projects: LinkOption[];
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell title="Add to the board" trigger={trigger} variant={variant} size={size}>
      {(close) => <ItemForm boardId={boardId} goals={goals} projects={projects} close={close} />}
    </DialogShell>
  );
}

function ItemForm({
  boardId,
  goals,
  projects,
  close,
}: {
  boardId: string;
  goals: LinkOption[];
  projects: LinkOption[];
  close: () => void;
}) {
  const [kind, setKind] = useState<VisionItemKind>('image');
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await addItemAction(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="kind" value={kind} />
      <div
        role="tablist"
        aria-label="Item kind"
        className="bg-card flex w-fit rounded-lg border p-0.5"
      >
        {ITEM_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              'rounded-md px-3 py-1 text-sm',
              kind === k
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <FieldGroup>
        {kind === 'image' && (
          <Field data-invalid={hasFieldError(state, 'image')}>
            <FieldLabel htmlFor="item-image">Image</FieldLabel>
            <Input
              id="item-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
            />
            <FieldDescription>
              JPEG, PNG, WebP or GIF up to 10 MB. Stored privately.
            </FieldDescription>
          </Field>
        )}
        {kind === 'quote' && (
          <>
            <Field data-invalid={hasFieldError(state, 'quoteText')}>
              <FieldLabel htmlFor="item-quote">Quote</FieldLabel>
              <Textarea
                id="item-quote"
                name="quoteText"
                rows={3}
                required
                maxLength={1000}
                autoFocus
              />
              <FieldError errors={fieldErrors(state, 'quoteText')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-author">Author</FieldLabel>
              <Input id="item-author" name="author" maxLength={120} />
            </Field>
          </>
        )}
        {kind === 'link' && (
          <Field data-invalid={hasFieldError(state, 'url')}>
            <FieldLabel htmlFor="item-url">Link</FieldLabel>
            <Input id="item-url" name="url" type="url" required placeholder="https://" autoFocus />
            <FieldError errors={fieldErrors(state, 'url')} />
          </Field>
        )}
        <Field data-invalid={hasFieldError(state, 'caption')}>
          <FieldLabel htmlFor="item-caption">Caption</FieldLabel>
          <Input id="item-caption" name="caption" maxLength={300} placeholder="Optional" />
          <FieldError errors={fieldErrors(state, 'caption')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="item-goal">Related goal</FieldLabel>
            <NativeSelect id="item-goal" name="goalId" defaultValue="">
              <option value="">None</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="item-project">Related project</FieldLabel>
            <NativeSelect id="item-project" name="projectId" defaultValue="">
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton pendingLabel="Adding…">Add to board</SubmitButton>
      </DialogFooter>
    </form>
  );
}
