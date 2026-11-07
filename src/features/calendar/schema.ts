import { z } from 'zod';
import { reminderFields } from '@/features/reminders/schema';

export const RECURRENCE_PRESETS = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;
export type RecurrencePreset = (typeof RECURRENCE_PRESETS)[number];

export const EVENT_CATEGORIES = ['general', 'appointment', 'self_care', 'work', 'other'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  general: 'General',
  appointment: 'Appointment',
  self_care: 'Self-care',
  work: 'Work',
  other: 'Other',
};

export const RECURRENCE_LABELS: Record<RecurrencePreset, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.');
/** `datetime-local` value, interpreted in the user's time zone. */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Choose a time.');

export const eventInput = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1, 'Give the event a title.').max(200),
    calendarId: z.uuid('Choose a calendar.'),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    category: z.enum(EVENT_CATEGORIES).default('general'),
    isAllDay: z.coerce.boolean().default(false),
    allDayDate: dateKey.optional(),
    startsAt: localDateTime.optional(),
    endsAt: localDateTime.optional(),
    location: z.string().trim().max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    recurrence: z.enum(RECURRENCE_PRESETS).default('none'),
    /** Capture this event was filed from; marked converted on save. */
    captureId: z.uuid().optional(),
    ...reminderFields,
  })
  .superRefine((v, ctx) => {
    if (v.reminder === 'custom' && !v.reminderAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['reminderAt'],
        message: 'Choose when to be reminded.',
      });
    }
    if (v.isAllDay) {
      if (!v.allDayDate)
        ctx.addIssue({ code: 'custom', path: ['allDayDate'], message: 'Choose a date.' });
      return;
    }
    if (!v.startsAt)
      ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Choose a start time.' });
    if (!v.endsAt)
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Choose an end time.' });
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'The end must be after the start.',
      });
    }
  });
export type EventInput = z.infer<typeof eventInput>;

export const moveInput = z.object({
  id: z.uuid(),
  allDay: z.boolean(),
  /** ISO instant (timed) or yyyy-MM-dd (all-day). */
  start: z.string().min(1),
  end: z.string().nullable(),
});
export type MoveInput = z.infer<typeof moveInput>;

export function presetToRRule(preset: RecurrencePreset): string | null {
  switch (preset) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekly':
      return 'FREQ=WEEKLY';
    case 'monthly':
      return 'FREQ=MONTHLY';
    case 'yearly':
      return 'FREQ=YEARLY';
    default:
      return null;
  }
}

export function rruleToPreset(rrule: string | null | undefined): RecurrencePreset {
  if (!rrule) return 'none';
  const freq = /FREQ=(\w+)/.exec(rrule)?.[1];
  switch (freq) {
    case 'DAILY':
      return 'daily';
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    case 'YEARLY':
      return 'yearly';
    default:
      return 'none';
  }
}
