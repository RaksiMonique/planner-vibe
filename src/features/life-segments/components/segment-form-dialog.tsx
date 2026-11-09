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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SegmentDot } from '@/components/shared/segment-badge';
import { SubmitButton } from '@/components/shared/submit-button';
import type { ActionResult } from '@/lib/action-result';
import { createSegmentAction, updateSegmentAction } from '../actions';
import { ACCENT_LABELS, ACCENTS } from '../schema';
import type { LifeSegment } from '../service';
import { ChoiceSelect } from './choice-select';
import { fieldErrors, hasFieldError } from './field-errors';

export function SegmentFormDialog({
  segment,
  trigger,
  variant = 'default',
}: {
  segment?: LifeSegment;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size="sm" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {segment ? 'Edit Life Segment' : 'New Life Segment'}
          </DialogTitle>
          <DialogDescription>
            An ongoing area of life. Every task, goal and event belongs to one.
          </DialogDescription>
        </DialogHeader>
        <SegmentForm segment={segment} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SegmentForm({ segment, onDone }: { segment?: LifeSegment; onDone: () => void }) {
  const action = segment ? updateSegmentAction : createSegmentAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {segment && <input type="hidden" name="id" value={segment.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="segment-name">Name</FieldLabel>
          <Input
            id="segment-name"
            name="name"
            defaultValue={segment?.name}
            required
            maxLength={60}
            autoFocus
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="segment-accent">Accent</FieldLabel>
          <ChoiceSelect
            id="segment-accent"
            name="accent"
            defaultValue={segment?.accent ?? 'burgundy'}
            options={ACCENTS.map((a) => ({
              value: a,
              label: (
                <span className="flex items-center gap-2">
                  <SegmentDot accent={a} />
                  {ACCENT_LABELS[a]}
                </span>
              ),
            }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="segment-icon">Icon</FieldLabel>
          <Input
            id="segment-icon"
            name="icon"
            defaultValue={segment?.icon ?? ''}
            placeholder="Optional lucide icon name, e.g. heart-pulse"
            maxLength={40}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="segment-weight">Weight</FieldLabel>
          <ChoiceSelect
            id="segment-weight"
            name="weight"
            defaultValue={String(segment?.weight ?? 1)}
            options={[1, 2, 3, 4, 5].map((n) => ({
              value: String(n),
              label: n === 1 ? '1 (lowest)' : n === 5 ? '5 (highest)' : String(n),
            }))}
          />
          <FieldDescription>How much this area counts in life-balance analytics.</FieldDescription>
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{segment ? 'Save changes' : 'Create segment'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
