'use client';

import { useActionState, useState } from 'react';
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
import type { ActionResult } from '@/lib/action-result';
import { createNoteAction, updateNoteAction } from '../actions';
import type { Note } from '../queries';
import type { NoteKind } from '../schema';

export function NoteFormDialog({
  kind,
  segments,
  note,
  defaultSegmentId,
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  kind: NoteKind;
  segments: SegmentRef[];
  note?: Note;
  defaultSegmentId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  const noun = kind === 'quote' ? 'quote' : 'note';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {note ? `Edit ${noun}` : `New ${noun}`}
          </DialogTitle>
          <DialogDescription>
            {kind === 'quote'
              ? 'Words worth keeping, with who said them.'
              : 'Anything you want to keep. Pinned notes stay at the top.'}
          </DialogDescription>
        </DialogHeader>
        <NoteForm
          kind={kind}
          segments={segments}
          note={note}
          defaultSegmentId={defaultSegmentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({
  kind,
  segments,
  note,
  defaultSegmentId,
  onDone,
}: {
  kind: NoteKind;
  segments: SegmentRef[];
  note?: Note;
  defaultSegmentId?: string;
  onDone: () => void;
}) {
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
