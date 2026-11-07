import { z } from 'zod';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const REMINDER_PRESETS = ['none', 'at_time', '1h_before', '1d_before', 'custom'] as const;
export type ReminderPreset = (typeof REMINDER_PRESETS)[number];

export const REMINDER_LABELS: Record<ReminderPreset, string> = {
  none: 'No reminder',
  at_time: 'At the time',
  '1h_before': '1 hour before',
  '1d_before': '1 day before',
  custom: 'Custom date and time',
};

/** `datetime-local` value, interpreted in the user's time zone. */
export const reminderLocalDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Choose a date and time.');

/** Fields a form adds next to its own data to carry a reminder. */
export const reminderFields = {
  /** Optional so forms and callers that know nothing about reminders keep working. */
  reminder: z.enum(REMINDER_PRESETS).optional(),
  reminderAt: reminderLocalDateTime.optional(),
};

export type ReminderInput = { reminder?: ReminderPreset; reminderAt?: string };

/** Tasks with only a due date remind at this hour in the user's zone (instructions.md 9.2). */
export const DEFAULT_REMINDER_HOUR = 9;
const HOUR = 3_600_000;

export type ReminderAnchor = {
  /** Exact instant the record is due or starts, when it has one. */
  dueAt?: Date | null;
  /** yyyy-MM-dd when the record only has a date. */
  dueDateKey?: string | null;
  timeZone: string;
};

export function anchorInstant(anchor: ReminderAnchor): Date | null {
  if (anchor.dueAt) return anchor.dueAt;
  if (anchor.dueDateKey) {
    const hh = String(DEFAULT_REMINDER_HOUR).padStart(2, '0');
    return fromZonedTime(`${anchor.dueDateKey}T${hh}:00:00`, anchor.timeZone);
  }
  return null;
}

/** The instant a preset means for a record, or null when nothing should fire. */
export function resolveReminderAt(
  preset: ReminderPreset | undefined,
  custom: string | undefined,
  anchor: ReminderAnchor
): Date | null {
  if (!preset || preset === 'none') return null;
  if (preset === 'custom') return custom ? fromZonedTime(custom, anchor.timeZone) : null;
  const base = anchorInstant(anchor);
  if (!base) return null;
  switch (preset) {
    case 'at_time':
      return base;
    case '1h_before':
      return new Date(base.getTime() - HOUR);
    case '1d_before':
      return new Date(base.getTime() - 24 * HOUR);
  }
}

/** Reverse mapping, so an existing reminder shows as the preset that produced it. */
export function presetForReminder(
  remindAt: Date | null,
  anchor: ReminderAnchor
): { preset: ReminderPreset; custom: string } {
  if (!remindAt) return { preset: 'none', custom: '' };
  const custom = formatInTimeZone(remindAt, anchor.timeZone, "yyyy-MM-dd'T'HH:mm");
  const base = anchorInstant(anchor);
  if (base) {
    const diff = base.getTime() - remindAt.getTime();
    if (diff === 0) return { preset: 'at_time', custom };
    if (diff === HOUR) return { preset: '1h_before', custom };
    if (diff === 24 * HOUR) return { preset: '1d_before', custom };
  }
  return { preset: 'custom', custom };
}
