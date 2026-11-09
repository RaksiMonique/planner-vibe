import { z } from 'zod';
import { PLAN_PRESETS } from './plans';

export const STUDY_KINDS = ['study', 'devotional', 'reading', 'course'] as const;
export const STUDY_KIND_LABELS: Record<(typeof STUDY_KINDS)[number], string> = {
  study: 'Bible study',
  devotional: 'Devotional',
  reading: 'Spiritual reading',
  course: 'Course',
};
export const STUDY_STATUSES = ['not_started', 'in_progress', 'done'] as const;
export type StudyStatus = (typeof STUDY_STATUSES)[number];
export const STUDY_STATUS_LABELS: Record<StudyStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};
export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
export const PRAYER_KINDS = ['intention', 'journal'] as const;
export const PRAYER_KIND_LABELS: Record<(typeof PRAYER_KINDS)[number], string> = {
  intention: 'Intention',
  journal: 'Journal',
};
export const PLAN_PRESET_KEYS = Object.keys(PLAN_PRESETS) as Array<keyof typeof PLAN_PRESETS>;

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v ? v : undefined));

export const studyInput = z.object({
  title: z.string().trim().min(1, 'Give the study a title.').max(160),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  kind: z.enum(STUDY_KINDS).default('study'),
  status: z.enum(STUDY_STATUSES).default('not_started'),
  priority: z.enum(PRIORITIES).default('medium'),
  translation: z.string().trim().max(40).optional(),
  prerequisiteId: z
    .string()
    .optional()
    .transform((v) => (v && v !== 'none' ? v : undefined))
    .pipe(z.uuid().optional()),
  description: optionalText,
});
export type StudyInput = z.infer<typeof studyInput>;

export const studyNoteInput = z.object({
  studyId: z.uuid(),
  content: z.string().trim().min(1, 'Write the note first.').max(8000),
  /** Typed reference such as "John 3:1-21"; parsed server-side. */
  reference: z.string().trim().max(60).optional(),
});

export const referenceInput = z.object({
  reference: z.string().trim().min(1, 'Type a passage such as John 3:16.').max(60),
  note: optionalText,
  isBookmark: z.coerce.boolean().default(false),
  isFavourite: z.coerce.boolean().default(false),
});

export const planInput = z.object({
  name: z.string().trim().min(1, 'Name the plan.').max(120),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  preset: z.enum(PLAN_PRESET_KEYS as [string, ...string[]]).default('whole'),
  /** Custom preset only: chosen book ids. */
  bookIds: z.array(z.coerce.number().int().min(1).max(73)).optional().default([]),
  chaptersPerDay: z.coerce.number().int().min(1, 'At least one chapter.').max(50).default(1),
  startDate: dateKeyValue,
});
export type PlanInput = z.infer<typeof planInput>;

export const prayerInput = z.object({
  kind: z.enum(PRAYER_KINDS).default('intention'),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  date: dateKeyValue,
  title: z.string().trim().min(1, 'Give it a title.').max(200),
  content: optionalText,
});
export type PrayerInput = z.infer<typeof prayerInput>;

export const devotionalInput = z.object({
  date: dateKeyValue,
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  title: z.string().trim().min(1, 'Give the devotional a title.').max(200),
  source: z.string().trim().max(200).optional(),
  reference: z.string().trim().max(60).optional(),
  reflection: optionalText,
});
export type DevotionalInput = z.infer<typeof devotionalInput>;
