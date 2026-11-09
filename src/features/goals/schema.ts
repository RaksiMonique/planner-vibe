import { z } from 'zod';
import { HORIZON_ORDER } from './progress';

export const HORIZONS = HORIZON_ORDER;
export const GOAL_STATUSES = ['planned', 'active', 'on_hold', 'achieved', 'abandoned'] as const;

export const HORIZON_LABELS: Record<(typeof HORIZONS)[number], string> = {
  lifelong: 'Lifelong',
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  weekly: 'Weekly',
};

export const GOAL_STATUS_LABELS: Record<(typeof GOAL_STATUSES)[number], string> = {
  planned: 'Planned',
  active: 'Active',
  on_hold: 'On hold',
  achieved: 'Achieved',
  abandoned: 'Abandoned',
};

const optionalNumber = z.coerce.number().nonnegative().optional();

export const goalInput = z.object({
  title: z.string().trim().min(1, 'Give the goal a title.').max(140),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  horizon: z.enum(HORIZONS),
  parentGoalId: z
    .union([z.uuid(), z.literal('none')])
    .optional()
    .transform((v) => (v === 'none' ? undefined : v)),
  targetDate: z.iso.date('Use a valid date.').optional(),
  status: z.enum(GOAL_STATUSES).default('active'),
  targetValue: optionalNumber,
  currentValue: optionalNumber,
  unit: z.string().trim().max(30).optional(),
  description: z.string().trim().max(2000).optional(),
});
export type GoalInput = z.infer<typeof goalInput>;
