import { z } from 'zod';
import { reminderFields } from '@/features/reminders/schema';
import { MONTHLY_MODES, RECURRENCE_ENDS, WEEKDAY_CODES } from '@/features/calendar/recurrence';
import { RECURRENCE_PRESETS } from '@/features/calendar/schema';

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
    recurrenceInterval: z.coerce.number().int().min(1).max(99).default(1),
    recurrenceDays: z.array(z.enum(WEEKDAY_CODES)).default([]),
    recurrenceMonthly: z.enum(MONTHLY_MODES).default('day'),
    recurrenceEnd: z.enum(RECURRENCE_ENDS).default('never'),
    recurrenceUntil: dateKey.optional(),
    recurrenceCount: z.coerce.number().int().min(1).max(999).optional(),
    blockedByIds: z.array(z.uuid()).default([]),
    ...reminderFields,
  })
  .refine((d) => !(d.reminder === 'custom' && !d.reminderAt), {
    message: 'Choose when to be reminded.',
    path: ['reminderAt'],
  })
  .refine((d) => !(d.recurrence !== 'none' && !d.dueDate), {
    message: 'Repeating tasks need a due date.',
    path: ['dueDate'],
  })
  .refine((d) => !(d.recurrence !== 'none' && d.recurrenceEnd === 'until' && !d.recurrenceUntil), {
    message: 'Choose the last day.',
    path: ['recurrenceUntil'],
  })
  .refine(
    (d) =>
      !(
        d.recurrence !== 'none' &&
        d.recurrenceEnd === 'until' &&
        d.recurrenceUntil &&
        d.dueDate &&
        d.recurrenceUntil < d.dueDate
      ),
    { message: 'The last day must be on or after the due date.', path: ['recurrenceUntil'] }
  )
  .refine((d) => !(d.recurrence !== 'none' && d.recurrenceEnd === 'count' && !d.recurrenceCount), {
    message: 'How many times?',
    path: ['recurrenceCount'],
  })
  .refine((d) => !(d.dueTime && !d.dueDate), {
    message: 'A time needs a date.',
    path: ['dueDate'],
  });
export type TaskInput = z.infer<typeof taskInput>;

export const taskStatusValue = z.enum(TASK_STATUSES);
