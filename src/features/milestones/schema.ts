import { z } from 'zod';

export const milestoneInput = z
  .object({
    title: z.string().trim().min(1, 'Give the milestone a title.').max(140),
    dueDate: z.iso.date().optional(),
    goalId: z.uuid().optional(),
    projectId: z.uuid().optional(),
  })
  .refine((v) => v.goalId || v.projectId, {
    message: 'A milestone belongs to a goal or a project.',
    path: ['title'],
  });
export type MilestoneInput = z.infer<typeof milestoneInput>;
