import { z } from 'zod';

export const PROJECT_STATUSES = ['planned', 'active', 'on_hold', 'done', 'archived'] as const;

export const PROJECT_STATUS_LABELS: Record<(typeof PROJECT_STATUSES)[number], string> = {
  planned: 'Planned',
  active: 'Active',
  on_hold: 'On hold',
  done: 'Done',
  archived: 'Archived',
};

export const projectInput = z
  .object({
    title: z.string().trim().min(1, 'Give the project a title.').max(140),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    status: z.enum(PROJECT_STATUSES).default('active'),
    startDate: z.iso.date('Use a valid date.').optional(),
    dueDate: z.iso.date('Use a valid date.').optional(),
    description: z.string().trim().max(2000).optional(),
    goalIds: z.array(z.uuid()).default([]),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate, {
    message: 'The due date must be on or after the start date.',
    path: ['dueDate'],
  });
export type ProjectInput = z.infer<typeof projectInput>;
