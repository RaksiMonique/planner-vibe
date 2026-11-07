import { z } from 'zod';

export const ROUTINE_KINDS = ['morning', 'evening', 'custom', 'skincare', 'haircare'] as const;
export type RoutineKind = (typeof ROUTINE_KINDS)[number];
export const ROUTINE_KIND_LABELS: Record<RoutineKind, string> = {
  morning: 'Morning',
  evening: 'Evening',
  custom: 'Custom',
  skincare: 'Skincare',
  haircare: 'Haircare',
};

/** Index = JavaScript `Date#getDay()`: 0 is Sunday. */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_LONG_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');

export const stepInput = z.object({
  /** Present for steps that already exist, so their completion history survives edits. */
  id: z.uuid().optional(),
  title: z.string().trim().min(1, 'Every step needs a title.').max(120),
  durationMinutes: z.coerce.number().int().min(1).max(600).optional(),
  habitId: z.uuid().optional(),
});
export type StepInput = z.infer<typeof stepInput>;

/** The form submits the steps as one JSON field built from client state. */
const stepsFromJson = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return undefined;
    }
  },
  z.array(stepInput).min(1, 'Add at least one step.')
);

export const routineInput = z
  .object({
    name: z.string().trim().min(1, 'Give the routine a name.').max(120),
    kind: z.enum(ROUTINE_KINDS).default('custom'),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    daysOfWeek: z
      .preprocess(
        (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
        z.array(z.coerce.number().int().min(0).max(6))
      )
      .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
    isTemplate: z.coerce.boolean().default(false),
    steps: stepsFromJson,
  })
  .refine((d) => d.isTemplate || d.daysOfWeek.length > 0, {
    message: 'Pick at least one day, or save it as a template.',
    path: ['daysOfWeek'],
  });
export type RoutineInput = z.infer<typeof routineInput>;
