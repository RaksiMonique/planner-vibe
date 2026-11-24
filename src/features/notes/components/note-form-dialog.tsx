'use client';

import { useActionState, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { MEDIA_KIND_LABELS, type MediaKind } from '@/features/media/schema';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createNoteAction, updateNoteAction } from '../actions';
import type { Note, SourceItemOption } from '../queries';
import type { NoteKind } from '../schema';
import { formatTags } from '../tags';

export type NoteFormProps = {
  kind: NoteKind;
  segments: SegmentRef[];
  note?: Note;
  defaultSegmentId?: string;
  /** Books and other items the note can name as its source. */
  sourceItems?: SourceItemOption[];
  defaultMediaItemId?: string;
  /** Tags already in use, offered as the input's suggestions. */
  tagSuggestions?: string[];
};

export function NoteFormDialog({
  trigger,
  variant = 'default',
  size = 'sm',
  ...form
}: NoteFormProps & {
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  const noun = form.kind === 'quote' ? 'quote' : 'note';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {form.note ? `Edit ${noun}` : `New ${noun}`}
          </DialogTitle>
          <DialogDescription>
            {form.kind === 'quote'
              ? 'Words worth keeping, with who said them and why they matter to you.'
              : 'Anything you want to keep, and why. Pinned notes stay at the top.'}
          </DialogDescription>
        </DialogHeader>
        <NoteForm {...form} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({
  kind,
  segments,
  note,
  defaultSegmentId,
  sourceItems = [],
  defaultMediaItemId,
  tagSuggestions = [],
  onDone,
}: NoteFormProps & { onDone: () => void }) {
  const action = note ? updateNoteAction : createNoteAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );
  const idPrefix = `${kind}-${note?.id ?? 'new'}`;
  const listId = useId();
  const groups = groupByKind(sourceItems, note?.mediaItemId ?? defaultMediaItemId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {note && <input type="hidden" name="id" value={note.id} />}
      <input type="hidden" name="kind" value={kind} />
      <FieldGroup>
        {kind === 'note' && (
          <Field data-invalid={hasFieldError(state, 'title')}>
            <FieldLabel htmlFor={`${idPrefix}-title`}>Title</FieldLabel>
            <Input
              id={`${idPrefix}-title`}
              name="title"
              defaultValue={note?.title ?? ''}
              maxLength={160}
              placeholder="Optional"
              autoFocus
            />
            <FieldError errors={fieldErrors(state, 'title')} />
          </Field>
        )}
        <Field data-invalid={hasFieldError(state, 'content')}>
          <FieldLabel htmlFor={`${idPrefix}-content`}>
            {kind === 'quote' ? 'Quote' : 'Note'}
          </FieldLabel>
          <Textarea
            id={`${idPrefix}-content`}
            name="content"
            rows={kind === 'quote' ? 3 : 6}
            defaultValue={note?.content ?? ''}
            required
            autoFocus={kind === 'quote'}
          />
          <FieldError errors={fieldErrors(state, 'content')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'why')}>
          <FieldLabel htmlFor={`${idPrefix}-why`}>Why it matters to me</FieldLabel>
          <Textarea
            id={`${idPrefix}-why`}
            name="why"
            rows={2}
            defaultValue={note?.why ?? ''}
            maxLength={2000}
            placeholder="What it means for your life. Without this line it fades."
          />
          <FieldError errors={fieldErrors(state, 'why')} />
        </Field>
        {kind === 'quote' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={hasFieldError(state, 'author')}>
              <FieldLabel htmlFor={`${idPrefix}-author`}>Author</FieldLabel>
              <Input
                id={`${idPrefix}-author`}
                name="author"
                defaultValue={note?.author ?? ''}
                maxLength={160}
              />
              <FieldError errors={fieldErrors(state, 'author')} />
            </Field>
            <Field data-invalid={hasFieldError(state, 'source')}>
              <FieldLabel htmlFor={`${idPrefix}-source`}>Source</FieldLabel>
              <Input
                id={`${idPrefix}-source`}
                name="source"
                defaultValue={note?.source ?? ''}
                maxLength={200}
                placeholder="Book, talk, letter…"
              />
              <FieldError errors={fieldErrors(state, 'source')} />
            </Field>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'tags')}>
            <FieldLabel htmlFor={`${idPrefix}-tags`}>Tags</FieldLabel>
            <Input
              id={`${idPrefix}-tags`}
              name="tags"
              list={tagSuggestions.length > 0 ? listId : undefined}
              defaultValue={note ? formatTags(note.tags) : ''}
              placeholder="specific beats broad, comma-separated"
              autoComplete="off"
            />
            {tagSuggestions.length > 0 && (
              <datalist id={listId}>
                {tagSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            )}
            <FieldError errors={fieldErrors(state, 'tags')} />
          </Field>
          {groups.length > 0 && (
            <Field data-invalid={hasFieldError(state, 'mediaItemId')}>
              <FieldLabel htmlFor={`${idPrefix}-source-item`}>From the tracker</FieldLabel>
              <NativeSelect
                id={`${idPrefix}-source-item`}
                name="mediaItemId"
                className="max-w-full"
                defaultValue={note?.mediaItemId ?? defaultMediaItemId ?? ''}
              >
                <option value="">Not from a tracked item</option>
                {groups.map((g) => (
                  <optgroup key={g.kind} label={g.label}>
                    {g.items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
              <FieldError errors={fieldErrors(state, 'mediaItemId')} />
            </Field>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor={`${idPrefix}-segment`}>Life Segment</FieldLabel>
            <SegmentSelect
              id={`${idPrefix}-segment`}
              segments={segments}
              defaultValue={note?.lifeSegmentId ?? defaultSegmentId}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
          <Field orientation="horizontal" className="items-center self-end">
            <Checkbox
              id={`${idPrefix}-pinned`}
              name="isPinned"
              defaultChecked={note?.isPinned ?? false}
            />
            <FieldLabel htmlFor={`${idPrefix}-pinned`}>
              {kind === 'quote' ? 'Favourite' : 'Pin'}
            </FieldLabel>
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
        <SubmitButton>
          {note ? 'Save changes' : kind === 'quote' ? 'Add quote' : 'Add note'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** Source items grouped by kind for the select; a stale current link stays selectable. */
function groupByKind(items: SourceItemOption[], currentId?: string | null) {
  const list =
    currentId && !items.some((i) => i.id === currentId)
      ? [...items, { id: currentId, title: 'Current source', kind: 'other' }]
      : items;
  const kinds = [...new Set(list.map((i) => i.kind))];
  return kinds.map((kind) => ({
    kind,
    label: MEDIA_KIND_LABELS[kind as MediaKind] ?? kind,
    items: list.filter((i) => i.kind === kind),
  }));
}
