'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { ReminderField } from '@/features/reminders/components/reminder-field';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { Accent } from '@/lib/accents';
import type { ActionResult } from '@/lib/action-result';
import { deleteEvent, saveEvent } from '../actions';
import {
  CATEGORY_LABELS,
  EVENT_CATEGORIES,
  RECURRENCE_LABELS,
  RECURRENCE_PRESETS,
} from '../schema';
import type { EventFormValues } from '../service';

export type CalendarOption = { id: string; name: string; accent: Accent };
export type SegmentOption = { id: string; name: string; accent: Accent };

export type EventDialogValues = Partial<EventFormValues> & { captureId?: string };

export function EventDialog({
  open,
  onOpenChange,
  values,
  calendars,
  segments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: EventDialogValues;
  calendars: CalendarOption[];
  segments: SegmentOption[];
  onSaved: () => void;
}) {
  // A new key per opening resets the form state to the supplied values.
  const formKey = `${values.id ?? 'new'}:${values.allDayDate ?? ''}:${values.startsAt ?? ''}:${values.captureId ?? ''}`;
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {values.id ? 'Edit event' : 'New event'}
          </DialogTitle>
          <DialogDescription>
            {values.captureId
              ? 'Filing a capture as an event. Choose a Life Segment to finish.'
              : 'Events belong to a calendar and a Life Segment.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <EventForm
            key={formKey}
            values={values}
            calendars={calendars}
            segments={segments}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const fieldErrors = (state: ActionResult<unknown> | null, name: string) =>
  state && !state.ok ? state.fieldErrors?.[name]?.map((message) => ({ message })) : undefined;

function EventForm({
  values,
  calendars,
  segments,
  onSaved,
}: {
  values: EventDialogValues;
  calendars: CalendarOption[];
  segments: SegmentOption[];
  onSaved: () => void;
}) {
  const [state, action] = useActionState(saveEvent, null);
  const [allDay, setAllDay] = useState(values.isAllDay ?? false);
  const [deleting, setDeleting] = useState(false);
  const handled = useRef<typeof state>(null);

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      onSaved();
    }
  }, [state, onSaved]);

  async function handleDelete() {
    if (!values.id) return;
    setDeleting(true);
    const result = await deleteEvent(values.id);
    setDeleting(false);
    if (result.ok) onSaved();
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.captureId && <input type="hidden" name="captureId" value={values.captureId} />}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="event-title">Title</FieldLabel>
          <Input
            id="event-title"
            name="title"
            defaultValue={values.title ?? ''}
            required
            autoFocus
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-calendar">Calendar</FieldLabel>
            <Select
              name="calendarId"
              defaultValue={values.calendarId ?? calendars[0]?.id ?? ''}
              items={calendars.map((c) => ({ value: c.id, label: c.name }))}
            >
              <SelectTrigger id="event-calendar" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <SegmentDot accent={c.accent} /> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors(state, 'calendarId')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="event-segment">Life Segment</FieldLabel>
            <Select
              name="lifeSegmentId"
              defaultValue={values.lifeSegmentId ?? ''}
              items={segments.map((s) => ({ value: s.id, label: s.name }))}
            >
              <SelectTrigger id="event-segment" className="w-full">
                <SelectValue placeholder="Choose a segment" />
              </SelectTrigger>
              <SelectContent>
                {segments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <SegmentDot accent={s.accent} /> {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
        </div>

        <Field orientation="horizontal">
          <Switch id="event-all-day" name="isAllDay" checked={allDay} onCheckedChange={setAllDay} />
          <FieldLabel htmlFor="event-all-day">All day</FieldLabel>
        </Field>

        {allDay ? (
          <Field>
            <FieldLabel htmlFor="event-date">Date</FieldLabel>
            <Input
              id="event-date"
              name="allDayDate"
              type="date"
              defaultValue={values.allDayDate ?? ''}
              required
            />
            <FieldError errors={fieldErrors(state, 'allDayDate')} />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="event-start">Starts</FieldLabel>
              <Input
                id="event-start"
                name="startsAt"
                type="datetime-local"
                defaultValue={values.startsAt ?? ''}
                required
              />
              <FieldError errors={fieldErrors(state, 'startsAt')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-end">Ends</FieldLabel>
              <Input
                id="event-end"
                name="endsAt"
                type="datetime-local"
                defaultValue={values.endsAt ?? ''}
                required
              />
              <FieldError errors={fieldErrors(state, 'endsAt')} />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-category">Category</FieldLabel>
            <Select
              name="category"
              defaultValue={values.category ?? 'general'}
              items={EVENT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
            >
              <SelectTrigger id="event-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="event-recurrence">Repeats</FieldLabel>
            <Select
              name="recurrence"
              defaultValue={values.recurrence ?? 'none'}
              items={RECURRENCE_PRESETS.map((p) => ({ value: p, label: RECURRENCE_LABELS[p] }))}
            >
              <SelectTrigger id="event-recurrence" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {RECURRENCE_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <ReminderField entityType="event" entityId={values.id} idPrefix="event" />
        <Field>
          <FieldLabel htmlFor="event-location">Location</FieldLabel>
          <Input id="event-location" name="location" defaultValue={values.location ?? ''} />
        </Field>
        <Field>
          <FieldLabel htmlFor="event-description">Notes</FieldLabel>
          <Textarea
            id="event-description"
            name="description"
            rows={3}
            defaultValue={values.description ?? ''}
          />
        </Field>
      </FieldGroup>

      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <DialogFooter className="sm:justify-between">
        {values.id ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button type="button" variant="destructive" size="sm" disabled={deleting} />}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                <AlertDialogDescription>
                  {values.recurrence && values.recurrence !== 'none'
                    ? 'The whole series will be removed.'
                    : 'It can be restored later from a data export, but not from the app.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <span />
        )}
        <SubmitButton>{values.id ? 'Save changes' : 'Create event'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
