'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { DialogShell } from '@/features/gifts/components/dialog-shell';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createBoardAction, updateBoardAction } from '../actions';
import type { VisionBoard } from '../queries';
import { VISION_CATEGORIES } from '../schema';

export type LinkOption = { id: string; title: string };

export function BoardFormDialog({
  board,
  segments,
  goals,
  projects,
  trigger,
  variant,
  size,
}: {
  board?: VisionBoard;
  segments: SegmentRef[];
  goals: LinkOption[];
  projects: LinkOption[];
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={board ? 'Edit board' : 'New vision board'}
      description="A board for one theme: a season, a room, a way of living, a long-term picture."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => (
        <BoardForm
          board={board}
          segments={segments}
          goals={goals}
          projects={projects}
          close={close}
        />
      )}
    </DialogShell>
  );
}

function BoardForm({
  board,
  segments,
  goals,
  projects,
  close,
}: {
  board?: VisionBoard;
  segments: SegmentRef[];
  goals: LinkOption[];
  projects: LinkOption[];
  close: () => void;
}) {
  const action = board ? updateBoardAction : createBoardAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      {board && <input type="hidden" name="id" value={board.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="board-name">Name</FieldLabel>
          <Input
            id="board-name"
            name="name"
            defaultValue={board?.name}
            required
            maxLength={120}
            autoFocus
            placeholder="Spring kitchen"
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="board-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="board-segment"
              segments={segments}
              defaultValue={board?.lifeSegmentId ?? null}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="board-category">Category</FieldLabel>
            <Input
              id="board-category"
              name="category"
              list="vision-categories"
              defaultValue={board?.category ?? ''}
              maxLength={80}
              placeholder="Seasonal, home renovation…"
            />
            <datalist id="vision-categories">
              {VISION_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="board-goal">Related goal</FieldLabel>
            <NativeSelect id="board-goal" name="goalId" defaultValue={board?.goalId ?? ''}>
              <option value="">None</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="board-project">Related project</FieldLabel>
            <NativeSelect id="board-project" name="projectId" defaultValue={board?.projectId ?? ''}>
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="board-description">Description</FieldLabel>
          <Textarea
            id="board-description"
            name="description"
            rows={2}
            defaultValue={board?.description ?? ''}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="board-cover">Cover image</FieldLabel>
          <Input
            id="board-cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
          />
          <FieldDescription>JPEG, PNG, WebP or GIF up to 10 MB. Stored privately.</FieldDescription>
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton pendingLabel="Saving…">
          {board ? 'Save changes' : 'Create board'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
