import { z } from 'zod';
import type { Accent } from '@/lib/accents';

export const ACTIVITY_TYPES = ['deep_work', 'light_work', 'break', 'custom'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  deep_work: 'Deep work',
  light_work: 'Light work',
  break: 'Break',
  custom: 'Custom',
};

/** Palette accent per activity type (instructions.md 8.21). */
export const ACTIVITY_ACCENT: Record<ActivityType, Accent> = {
  deep_work: 'burgundy',
  light_work: 'sage',
  break: 'beige',
  custom: 'terracotta',
};

/** Preset block lengths in minutes; anything else is a custom end time. */
export const DURATION_PRESETS = [15, 30, 60, 120, 180] as const;

export const BLOCK_RECURRENCE = ['none', 'daily', 'weekdays', 'weekly'] as const;
export type BlockRecurrence = (typeof BLOCK_RECURRENCE)[number];

export const BLOCK_RECURRENCE_LABELS: Record<BlockRecurrence, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekly: 'Every week',
};

export function presetToRRule(preset: BlockRecurrence): string | null {
  switch (preset) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'weekly':
      return 'FREQ=WEEKLY';
    default:
      return null;
  }
}

export function rruleToPreset(rrule: string | null | undefined): BlockRecurrence {
  if (!rrule) return 'none';
  if (/FREQ=DAILY/.test(rrule)) return 'daily';
  if (/FREQ=WEEKLY/.test(rrule)) return /BYDAY=MO,TU,WE,TH,FR/.test(rrule) ? 'weekdays' : 'weekly';
  return 'none';
}

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.');
/** `datetime-local` value, interpreted in the user's time zone. */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Choose a time.');
const optionalUuid = z.preprocess(
  (v) => (v === '' || v === 'none' ? undefined : v),
  z.uuid().optional()
);

export const blockInput = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1, 'Give the block a title.').max(200),
    activityType: z.enum(ACTIVITY_TYPES).default('custom'),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    projectId: optionalUuid,
    taskId: optionalUuid,
    startsAt: localDateTime,
    /** One of the presets, or 'custom' to use `endsAt`. */
    duration: z.string().default('60'),
    endsAt: localDateTime.optional(),
    recurrence: z.enum(BLOCK_RECURRENCE).default('none'),
  })
  .superRefine((v, ctx) => {
    if (v.duration === 'custom') {
      if (!v.endsAt)
        ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Choose an end time.' });
      else if (v.endsAt <= v.startsAt)
        ctx.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'The end must be after the start.',
        });
    } else if (!DURATION_PRESETS.some((d) => String(d) === v.duration)) {
      ctx.addIssue({ code: 'custom', path: ['duration'], message: 'Choose a length.' });
    }
  });
export type BlockInput = z.infer<typeof blockInput>;

export const moveBlockInput = z.object({
  id: z.uuid(),
  /** ISO instants. */
  start: z.string().min(1),
  end: z.string().nullable(),
});
export type MoveBlockInput = z.infer<typeof moveBlockInput>;

export const entryInput = z
  .object({
    id: z.uuid().optional(),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    projectId: optionalUuid,
    taskId: optionalUuid,
    timeBlockId: optionalUuid,
    startedAt: localDateTime,
    endedAt: localDateTime.optional(),
    durationMinutes: z.preprocess(
      (v) => (v === '' || v === undefined ? undefined : Number(v)),
      z
        .number()
        .int()
        .min(1)
        .max(24 * 60)
        .optional()
    ),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.endedAt && !v.durationMinutes)
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'Give an end time or a duration.',
      });
    if (v.endedAt && v.endedAt <= v.startedAt)
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'The end must be after the start.',
      });
  });
export type EntryInput = z.infer<typeof entryInput>;

export const timerStartInput = z.object({
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  projectId: optionalUuid,
  taskId: optionalUuid,
  timeBlockId: optionalUuid,
  note: z.string().trim().max(1000).optional(),
});
export type TimerStartInput = z.infer<typeof timerStartInput>;

export const TEMPLATE_KINDS = ['day', 'week'] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const templateSaveInput = z.object({
  name: z.string().trim().min(1, 'Name the template.').max(80),
  kind: z.enum(TEMPLATE_KINDS).default('day'),
  /** Any date inside the visible day or week. */
  date: dateKey,
});
export type TemplateSaveInput = z.infer<typeof templateSaveInput>;

export const templateApplyInput = z.object({
  id: z.uuid(),
  date: dateKey,
  /** Used for template blocks that carry no segment of their own. */
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
});
export type TemplateApplyInput = z.infer<typeof templateApplyInput>;

/** Format a minute count as "2 h 30 min" / "45 min". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  if (rest === 0) return `${h} h`;
  return `${h} h ${rest} min`;
}
