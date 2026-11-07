'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ActionResult } from '@/lib/action-result';
import { createPrayerAction, updatePrayerAction } from '../actions';
import type { PrayerEntry } from '../queries';
import { PRAYER_KIND_LABELS, PRAYER_KINDS } from '../schema';

export function PrayerFormDialog({
  segments,
  entry,
  defaultKind = 'intention',
  defaultSegmentId,
  todayKey,
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  segments: SegmentRef[];
  entry?: PrayerEntry;
  defaultKind?: PrayerEntry['kind'];
  defaultSegmentId?: string;
  todayKey: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  const action = entry ? updatePrayerAction : createPrayerAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    null
  );
  const kind = entry?.kind ?? defaultKind;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {entry ? 'Edit entry' : kind === 'intention' ? 'New intention' : 'New journal entry'}
          </DialogTitle>
          <DialogDescription>
            {kind === 'intention'
              ? 'Someone or something to keep praying for. Mark it answered when it is.'
              : 'A dated entry in the prayer journal.'}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {entry && <input type="hidden" name="id" value={entry.id} />}
          <FieldGroup>
            <Field data-invalid={hasFieldError(state, 'title')}>
              <FieldLabel htmlFor="prayer-title">
                {kind === 'intention' ? 'Intention' : 'Title'}
              </FieldLabel>
              <Input
                id="prayer-title"
                name="title"
                defaultValue={entry?.title}
                required
                maxLength={200}
                autoFocus
                placeholder={kind === 'intention' ? "Mum's surgery on Friday" : 'Morning prayer'}
              />
              <FieldError errors={fieldErrors(state, 'title')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="prayer-kind">Kind</FieldLabel>
                <ChoiceSelect
                  id="prayer-kind"
                  name="kind"
                  defaultValue={kind}
                  options={PRAYER_KINDS.map((k) => ({ value: k, label: PRAYER_KIND_LABELS[k] }))}
                />
              </Field>
              <Field data-invalid={hasFieldError(state, 'date')}>
                <FieldLabel htmlFor="prayer-date">Date</FieldLabel>
                <Input
                  id="prayer-date"
                  name="date"
                  type="date"
                  defaultValue={entry?.date ?? todayKey}
                  required
                />
                <FieldError errors={fieldErrors(state, 'date')} />
              </Field>
            </div>
            <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
              <FieldLabel htmlFor="prayer-segment">Life Segment</FieldLabel>
              <SegmentSelect
                id="prayer-segment"
                segments={segments}
                defaultValue={entry?.lifeSegmentId ?? defaultSegmentId}
              />
              <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="prayer-content">Notes</FieldLabel>
              <Textarea
                id="prayer-content"
                name="content"
                rows={4}
                defaultValue={entry?.content ?? ''}
              />
            </Field>
          </FieldGroup>
          {state && !state.ok && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <SubmitButton>{entry ? 'Save changes' : 'Add'}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
