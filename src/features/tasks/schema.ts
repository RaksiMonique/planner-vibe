import { z } from 'zod';
import { RECURRENCE_PRESETS } from './recurrence';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};
export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const timeKey = z.string().regex(/^\d{2}:\d{2}$/, 'Use a time like 14:30.');
const optionalUuid = z.uuid().optional();

export const taskInput = z
  .object({
    title: z.string().trim().min(1, 'Give the task a title.').max(200),
    notes: z.string().trim().max(5000).optional(),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    projectId: optionalUuid,
    goalId: optionalUuid,
    milestoneId: optionalUuid,
    parentTaskId: optionalUuid,
    priority: z.enum(PRIORITIES).default('medium'),
    isImportant: z.coerce.boolean().default(false),
    status: z.enum(TASK_STATUSES).default('todo'),
    dueDate: dateKey.optional(),
    dueTime: timeKey.optional(),
    recurrence: z.enum(RECURRENCE_PRESETS).default('none'),
  })
  .refine((d) => !(d.recurrence !== 'none' && !d.dueDate), {
    message: 'Repeating tasks need a due date.',
    path: ['dueDate'],
  })
  .refine((d) => !(d.dueTime && !d.dueDate), {
    message: 'A time needs a date.',
    path: ['dueDate'],
  });
export type TaskInput = z.infer<typeof taskInput>;

export const taskStatusValue = z.enum(TASK_STATUSES);
