import { z } from 'zod';
import { needsAnchor, REPEAT_KEYS, REPEATS } from './schedule';

export const ROUTINE_KINDS = ['morning', 'evening', 'custom', 'skincare', 'haircare'] as const;
export type RoutineKind = (typeof ROUTINE_KINDS)[number];
export const ROUTINE_KIND_LABELS: Record<RoutineKind, string> = {
  morning: 'Morning',
  evening: 'Evening',
  custom: 'Custom',
  skincare: 'Skincare',
  haircare: 'Haircare',
};

export { DAY_LABELS, DAY_LONG_LABELS } from './schedule';

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

export const timeValue = z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.');

export const routineInput = z
  .object({
    name: z.string().trim().min(1, 'Give the routine a name.').max(120),
    kind: z.enum(ROUTINE_KINDS).default('custom'),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    repeat: z.enum(REPEAT_KEYS).default('weekly-1'),
    startsOn: dateKeyValue.optional(),
    daysOfWeek: z
      .preprocess(
        (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
        z.array(z.coerce.number().int().min(0).max(6))
      )
      .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
    hasAppointment: z.coerce.boolean().default(false),
    appointmentTime: timeValue.optional(),
    appointmentMinutes: z.coerce.number().int().min(5).max(600).default(60),
    location: z.string().trim().max(200).optional(),
    isTemplate: z.coerce.boolean().default(false),
    steps: stepsFromJson,
  })
  .superRefine((d, ctx) => {
    const { frequency, interval } = REPEATS[d.repeat];
    if (frequency === 'weekly' && !d.isTemplate && d.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['daysOfWeek'],
        message: 'Pick at least one day, or save it as a template.',
      });
    }
    if (needsAnchor({ frequency, interval }) && !d.startsOn && !d.isTemplate) {
      ctx.addIssue({ code: 'custom', path: ['startsOn'], message: 'Choose the first day.' });
    }
    if (d.hasAppointment && !d.appointmentTime) {
      ctx.addIssue({ code: 'custom', path: ['appointmentTime'], message: 'Choose a time.' });
    }
  })
  .transform((d) => {
    const { frequency, interval } = REPEATS[d.repeat];
    return {
      ...d,
      frequency,
      interval,
      daysOfWeek: frequency === 'weekly' ? d.daysOfWeek : [],
      startsOn: needsAnchor({ frequency, interval }) ? (d.startsOn ?? null) : null,
      appointmentTime: d.hasAppointment ? (d.appointmentTime ?? null) : null,
      appointmentMinutes: d.hasAppointment ? d.appointmentMinutes : null,
      location: d.hasAppointment ? d.location || null : null,
    };
  });
export type RoutineInput = z.infer<typeof routineInput>;
