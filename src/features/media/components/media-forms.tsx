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
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { addMediaLogAction, createMediaItemAction, updateMediaItemAction } from '../actions';
import type { MediaItem } from '../queries';
import {
  BOOK_STATUS_LABELS,
  CREATOR_LABELS,
  MEDIA_KIND_LABELS,
  MEDIA_KINDS,
  MEDIA_STATUSES,
  STATUS_LABELS,
  type MediaKind,
} from '../schema';

function Shell({
  title,
  description,
  trigger,
  variant = 'default',
  size = 'sm',
  children,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

export function MediaItemFormDialog({
  segments,
  item,
  defaultKind = 'book',
  defaultSegmentId,
  trigger,
  variant,
  size,
}: {
  segments: SegmentRef[];
  item?: MediaItem;
  defaultKind?: MediaKind;
  defaultSegmentId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <Shell
      title={item ? 'Edit item' : `Add a ${MEDIA_KIND_LABELS[defaultKind].toLowerCase()}`}
      description="Status, dates and a rating; log progress as you go."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => (
        <ItemForm
          segments={segments}
          item={item}
          defaultKind={defaultKind}
          defaultSegmentId={defaultSegmentId}
          close={close}
        />
      )}
    </Shell>
  );
}

function ItemForm({
  segments,
  item,
  defaultKind,
  defaultSegmentId,
  close,
}: {
  segments: SegmentRef[];
  item?: MediaItem;
  defaultKind: MediaKind;
  defaultSegmentId?: string;
  close: () => void;
}) {
  const action = item ? updateMediaItemAction : createMediaItemAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  const [kind, setKind] = useState<MediaKind>(item?.kind ?? defaultKind);
  const statusLabels = kind === 'book' ? BOOK_STATUS_LABELS : STATUS_LABELS;
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field>
            <FieldLabel htmlFor="media-kind">Kind</FieldLabel>
            <NativeSelect
              id="media-kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as MediaKind)}
            >
              {MEDIA_KINDS.map((k) => (
                <option key={k} value={k}>
                  {MEDIA_KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={hasFieldError(state, 'title')}>
            <FieldLabel htmlFor="media-title">Title</FieldLabel>
            <Input
              id="media-title"
              name="title"
              defaultValue={item?.title}
              required
              maxLength={200}
              autoFocus
            />
            <FieldError errors={fieldErrors(state, 'title')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="media-creator">{CREATOR_LABELS[kind]}</FieldLabel>
            <Input
              id="media-creator"
              name="creator"
              defaultValue={item?.creator ?? ''}
              maxLength={200}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="media-category">Category</FieldLabel>
            <Input
              id="media-category"
              name="category"
              defaultValue={item?.category ?? ''}
              maxLength={80}
              placeholder={kind === 'book' ? 'Spiritual, fiction…' : 'Drama, comedy…'}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="media-status">Status</FieldLabel>
            <NativeSelect id="media-status" name="status" defaultValue={item?.status ?? 'wishlist'}>
              {MEDIA_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={hasFieldError(state, 'rating')}>
            <FieldLabel htmlFor="media-rating">Rating</FieldLabel>
            <NativeSelect
              id="media-rating"
              name="rating"
              defaultValue={item?.rating ? String(item.rating) : ''}
            >
              <option value="">Not rated</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={fieldErrors(state, 'rating')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="media-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="media-segment"
              segments={segments}
              required={false}
              defaultValue={item?.lifeSegmentId ?? defaultSegmentId ?? null}
            />
            <FieldDescription>Optional for the library; logs always need one.</FieldDescription>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="media-started">Started</FieldLabel>
            <Input
              id="media-started"
              name="startedOn"
              type="date"
              defaultValue={item?.startedOn ?? ''}
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'finishedOn')}>
            <FieldLabel htmlFor="media-finished">Finished</FieldLabel>
            <Input
              id="media-finished"
              name="finishedOn"
              type="date"
              defaultValue={item?.finishedOn ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'finishedOn')} />
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'coverUrl')}>
          <FieldLabel htmlFor="media-cover">Cover image link</FieldLabel>
          <Input
            id="media-cover"
            name="coverUrl"
            type="url"
            defaultValue={item?.coverUrl ?? ''}
            placeholder="https://"
          />
          <FieldError errors={fieldErrors(state, 'coverUrl')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="media-review">Review</FieldLabel>
          <Textarea id="media-review" name="review" rows={3} defaultValue={item?.review ?? ''} />
        </Field>
        <Field>
          <FieldLabel htmlFor="media-notes">Notes</FieldLabel>
          <Textarea id="media-notes" name="notes" rows={2} defaultValue={item?.notes ?? ''} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isFavourite" defaultChecked={item?.isFavourite ?? false} />
          Favourite
        </label>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{item ? 'Save changes' : 'Add to library'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function MediaLogDialog({
  item,
  segments,
  todayKey,
  trigger,
  variant = 'outline',
  size = 'xs',
}: {
  item: MediaItem;
  segments: SegmentRef[];
  todayKey: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <Shell
      title={`Log progress: ${item.title}`}
      description="A page, a chapter, an episode or a listen. Logging a wish-listed item starts it."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => {
        const Form = () => {
          const [state, formAction] = useActionState(
            async (prev: ActionResult | null, fd: FormData) => {
              const result = await addMediaLogAction(prev, fd);
              if (result.ok) close();
              return result;
            },
            null
          );
          return (
            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="mediaItemId" value={item.id} />
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={hasFieldError(state, 'date')}>
                    <FieldLabel htmlFor="log-date">Date</FieldLabel>
                    <Input id="log-date" name="date" type="date" defaultValue={todayKey} required />
                    <FieldError errors={fieldErrors(state, 'date')} />
                  </Field>
                  <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
                    <FieldLabel htmlFor="log-segment">Life Segment</FieldLabel>
                    <SegmentSelect
                      id="log-segment"
                      segments={segments}
                      defaultValue={item.lifeSegmentId}
                    />
                    <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="log-progress">Where you got to</FieldLabel>
                    <Input
                      id="log-progress"
                      name="progress"
                      maxLength={80}
                      placeholder={item.kind === 'book' ? 'p. 120' : 'S2E3'}
                    />
                  </Field>
                  <Field data-invalid={hasFieldError(state, 'minutes')}>
                    <FieldLabel htmlFor="log-minutes">Minutes</FieldLabel>
                    <Input id="log-minutes" name="minutes" type="number" min={1} max={1440} />
                    <FieldError errors={fieldErrors(state, 'minutes')} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="log-note">Note</FieldLabel>
                  <Textarea id="log-note" name="note" rows={2} />
                </Field>
              </FieldGroup>
              {state && !state.ok && (
                <p role="alert" className="text-destructive text-sm">
                  {state.error}
                </p>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <SubmitButton>Log progress</SubmitButton>
              </DialogFooter>
            </form>
          );
        };
        return <Form />;
      }}
    </Shell>
  );
}
