import { z } from 'zod';
import { ACCENTS } from '@/features/life-segments/schema';

export const COURSE_STATUSES = ['planned', 'in_progress', 'done', 'dropped'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  dropped: 'Dropped',
};

export const SESSION_KINDS = ['focus', 'pomodoro', 'reading', 'review'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];
export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  focus: 'Focused study',
  pomodoro: 'Pomodoro',
  reading: 'Reading',
  review: 'Review',
};

export const RESOURCE_KINDS = ['link', 'book', 'video', 'file', 'other'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  link: 'Link',
  book: 'Book',
  video: 'Video',
  file: 'File',
  other: 'Other',
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Use a full date and time.');
const optionalUuid = z.uuid().optional();
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Use a full address starting with http.');

export const subjectInput = z.object({
  name: z.string().trim().min(1, 'Give the subject a name.').max(120),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  description: z.string().trim().max(2000).optional(),
  accent: z
    .enum([...ACCENTS, 'segment'])
    .default('segment')
    .transform((v) => (v === 'segment' ? undefined : v)),
});
export type SubjectInput = z.infer<typeof subjectInput>;

export const courseInput = z
  .object({
    title: z.string().trim().min(1, 'Give the course a title.').max(200),
    lifeSegmentId: z.uuid('Choose a Life Segment.'),
    subjectId: optionalUuid,
    projectId: optionalUuid,
    provider: z.string().trim().max(120).optional(),
    url: optionalUrl,
    status: z.enum(COURSE_STATUSES).default('planned'),
    startDate: dateKey.optional(),
    dueDate: dateKey.optional(),
    progress: z.coerce.number().int().min(0).max(100).default(0),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((d) => !(d.startDate && d.dueDate && d.dueDate < d.startDate), {
    message: 'The due date is before the start.',
    path: ['dueDate'],
  });
export type CourseInput = z.infer<typeof courseInput>;

export const lessonInput = z.object({
  courseId: z.uuid(),
  title: z.string().trim().min(1, 'Give the lesson a title.').max(200),
  durationMinutes: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).max(600).optional()
  ),
});
export type LessonInput = z.infer<typeof lessonInput>;

export const assignmentInput = z.object({
  title: z.string().trim().min(1, 'Give the assignment a title.').max(200),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  courseId: optionalUuid,
  subjectId: optionalUuid,
  dueDate: dateKey.optional(),
  notes: z.string().trim().max(5000).optional(),
});
export type AssignmentInput = z.infer<typeof assignmentInput>;

export const studyNoteInput = z.object({
  title: z.string().trim().min(1, 'Give the note a title.').max(200),
  content: z.string().trim().max(20000).optional(),
  subjectId: optionalUuid,
  courseId: optionalUuid,
  lessonId: optionalUuid,
});
export type StudyNoteInput = z.infer<typeof studyNoteInput>;

export const resourceInput = z.object({
  title: z.string().trim().min(1, 'Give the resource a title.').max(200),
  kind: z.enum(RESOURCE_KINDS).default('link'),
  url: optionalUrl,
  note: z.string().trim().max(2000).optional(),
  subjectId: optionalUuid,
  courseId: optionalUuid,
});
export type ResourceInput = z.infer<typeof resourceInput>;

/** A session logged by hand; Pomodoro sessions come from the timer instead. */
export const sessionInput = z.object({
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  subjectId: optionalUuid,
  courseId: optionalUuid,
  lessonId: optionalUuid,
  kind: z.enum(SESSION_KINDS).default('focus'),
  startedAt: localDateTime,
  durationMinutes: z.coerce.number().int().min(1, 'At least a minute.').max(720),
  note: z.string().trim().max(2000).optional(),
});
export type SessionInput = z.infer<typeof sessionInput>;

export const pomodoroStartInput = z.object({
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  subjectId: optionalUuid,
  courseId: optionalUuid,
  lessonId: optionalUuid,
});
export type PomodoroStartInput = z.infer<typeof pomodoroStartInput>;

export const pomodoroStopInput = z.object({
  sessionId: z.uuid(),
  pomodoros: z.coerce.number().int().min(0).max(50).default(0),
  note: z.string().trim().max(2000).optional(),
});
export type PomodoroStopInput = z.infer<typeof pomodoroStopInput>;
