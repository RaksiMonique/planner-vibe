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
import { createStudyAction, updateStudyAction } from '../actions';
import type { BibleStudy } from '../queries';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STUDY_KIND_LABELS,
  STUDY_KINDS,
  STUDY_STATUS_LABELS,
  STUDY_STATUSES,
} from '../schema';

type StudyOption = Pick<BibleStudy, 'id' | 'title' | 'status'>;

export function StudyFormDialog({
  segments,
  studies,
  study,
  defaultSegmentId,
  trigger,
  variant = 'default',
  size = 'sm',
}: {
  segments: SegmentRef[];
  /** Other studies, offered as prerequisites. */
  studies: StudyOption[];
  study?: BibleStudy;
  defaultSegmentId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {study ? 'Edit study' : 'New study'}
          </DialogTitle>
          <DialogDescription>
            A study, devotional series, spiritual book or course. Notes and passages attach to it.
          </DialogDescription>
        </DialogHeader>
        <StudyForm
          segments={segments}
          studies={studies.filter((s) => s.id !== study?.id)}
          study={study}
          defaultSegmentId={defaultSegmentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function StudyForm({
  segments,
  studies,
  study,
  defaultSegmentId,
  onDone,
}: {
  segments: SegmentRef[];
  studies: StudyOption[];
  study?: BibleStudy;
  defaultSegmentId?: string;
  onDone: () => void;
}) {
  const action = study ? updateStudyAction : createStudyAction;
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
      {study && <input type="hidden" name="id" value={study.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="study-title">Title</FieldLabel>
          <Input
            id="study-title"
            name="title"
            defaultValue={study?.title}
            required
            maxLength={160}
            autoFocus
            placeholder="The Gospel of John"
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
          <FieldLabel htmlFor="study-segment">Life Segment</FieldLabel>
          <SegmentSelect
            id="study-segment"
            segments={segments}
            defaultValue={study?.lifeSegmentId ?? defaultSegmentId}
          />
          <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="study-kind">Kind</FieldLabel>
            <ChoiceSelect
              id="study-kind"
              name="kind"
              defaultValue={study?.kind ?? 'study'}
              options={STUDY_KINDS.map((k) => ({ value: k, label: STUDY_KIND_LABELS[k] }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="study-priority">Priority</FieldLabel>
            <ChoiceSelect
              id="study-priority"
              name="priority"
              defaultValue={study?.priority ?? 'medium'}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="study-status">Status</FieldLabel>
            <ChoiceSelect
              id="study-status"
              name="status"
              defaultValue={study?.status ?? 'not_started'}
              options={STUDY_STATUSES.map((s) => ({ value: s, label: STUDY_STATUS_LABELS[s] }))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="study-translation">Translation</FieldLabel>
            <Input
              id="study-translation"
              name="translation"
              defaultValue={study?.translation ?? ''}
              maxLength={40}
              placeholder="NABRE, RSV-CE, Jerusalem"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="study-prerequisite">Comes after</FieldLabel>
            <ChoiceSelect
              id="study-prerequisite"
              name="prerequisiteId"
              defaultValue={study?.prerequisiteId ?? 'none'}
              options={[
                { value: 'none', label: 'Nothing' },
                ...studies.map((s) => ({ value: s.id, label: s.title })),
              ]}
            />
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'description')}>
          <FieldLabel htmlFor="study-description">Description</FieldLabel>
          <Textarea
            id="study-description"
            name="description"
            rows={3}
            defaultValue={study?.description ?? ''}
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
        <SubmitButton>{study ? 'Save changes' : 'Create study'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
