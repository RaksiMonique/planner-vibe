import { z } from 'zod';
import { ACCENTS } from '@/features/life-segments/schema';
import { parseLinkValue } from './links';

export const HABIT_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];
export const FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};
export const PERIOD_NOUN: Record<HabitFrequency, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const timeKey = z.string().regex(/^\d{2}:\d{2}$/, 'Use a time like 07:30.');

/** 'segment' means "use the Life Segment's colour" and is stored as null. */
export const habitInput = z.object({
  name: z.string().trim().min(1, 'Give the habit a name.').max(120),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  frequency: z.enum(HABIT_FREQUENCIES).default('daily'),
  target: z.coerce.number().int().min(1, 'At least once.').max(99).default(1),
  accent: z
    .enum([...ACCENTS, 'segment'])
    .default('segment')
    .transform((v) => (v === 'segment' ? undefined : v)),
  reminderTime: timeKey.optional(),
  /** How it goes: where to start, what counts, what a good session looks like. */
  details: z.string().trim().max(5000).optional(),
  /** `kind:id` for the course, subject, Bible study, reading plan or routine it serves. */
  link: z
    .string()
    .optional()
    .refine((v) => !v || parseLinkValue(v) !== null, 'Choose something from the list.'),
});
export type HabitInput = z.infer<typeof habitInput>;

export const planItemInput = z.object({
  habitId: z.uuid(),
  title: z.string().trim().min(1, 'Say what to do.').max(200),
  plannedDate: z.preprocess((v) => (v === '' ? undefined : v), dateKeyValue.optional()),
});
export type PlanItemInput = z.infer<typeof planItemInput>;
