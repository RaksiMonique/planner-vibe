'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getPreferences } from '@/features/settings/service';
import type { TaskContext } from '@/features/tasks/service';
import {
  fail,
  formValues,
  fromError,
  fromZodError,
  ok,
  type ActionResult,
} from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import {
  assignmentInput,
  COURSE_STATUSES,
  courseInput,
  lessonInput,
  pomodoroStartInput,
  pomodoroStopInput,
  resourceInput,
  sessionInput,
  studyNoteInput,
  subjectInput,
} from './schema';
import {
  addLesson,
  createAssignment,
  createCourse,
  createResource,
  createStudyNote,
  createSubject,
  logSession,
  moveLesson,
  removeAssignment,
  removeCourse,
  removeLesson,
  removeResource,
  removeSession,
  removeStudyNote,
  removeSubject,
  setAssignmentDone,
  setCourseStatus,
  setLessonDone,
  setSubjectArchived,
  startPomodoroSession,
  stopPomodoroSession,
  updateCourse,
  updateStudyNote,
  updateSubject,
} from './service';

/** Study data shows on the study pages, in tasks (assignments), the calendar and time tracking. */
function refresh() {
  revalidatePath('/', 'layout');
}

const withId = z.object({ id: z.uuid() });

async function taskContext(userId: string): Promise<TaskContext> {
  const prefs = await getPreferences(userId);
  return { timeZone: prefs.timeZone, todayKey: toDateKey(todayInZone(prefs.timeZone)) };
}

type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/** Builds a create/update form action from a schema and a service call. */
function formAction<T>(
  schema: z.ZodType<T, unknown>,
  run: (userId: string, data: T, values: Record<string, unknown>) => Promise<unknown>
): FormAction {
  return async (_prev, formData) => {
    try {
      const user = await requireUser();
      const values = formValues(formData);
      const parsed = schema.safeParse(values);
      if (!parsed.success) return fromZodError(parsed.error);
      await run(user.id, parsed.data, values);
      refresh();
      return ok(undefined);
    } catch (e) {
      return fromError(e);
    }
  };
}

function idOf(values: Record<string, unknown>): string {
  const parsed = withId.safeParse(values);
  if (!parsed.success) throw new Error('Missing id.');
  return parsed.data.id;
}

// subjects
export const createSubjectAction: FormAction = formAction(subjectInput, (u, d) =>
  createSubject(u, d)
);
export const updateSubjectAction: FormAction = formAction(subjectInput, (u, d, v) =>
  updateSubject(u, idOf(v), d)
);
export async function setSubjectArchivedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ archived: z.coerce.boolean() }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setSubjectArchived(user.id, parsed.data.id, parsed.data.archived);
  refresh();
}
export async function deleteSubjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeSubject(user.id, parsed.data.id);
  refresh();
}

// courses
export const createCourseAction: FormAction = formAction(courseInput, (u, d) => createCourse(u, d));
export const updateCourseAction: FormAction = formAction(courseInput, (u, d, v) =>
  updateCourse(u, idOf(v), d)
);
export async function setCourseStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ status: z.enum(COURSE_STATUSES) }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setCourseStatus(user.id, parsed.data.id, parsed.data.status);
  refresh();
}
export async function deleteCourseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeCourse(user.id, parsed.data.id);
  refresh();
  redirect('/study');
}

// lessons
export const addLessonAction: FormAction = formAction(lessonInput, (u, d) => addLesson(u, d));
export async function setLessonDoneAction(id: string, done: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('That lesson is not valid.');
    await setLessonDone(user.id, id, done);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
export async function moveLessonAction(
  id: string,
  direction: 'up' | 'down'
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('That lesson is not valid.');
    await moveLesson(user.id, id, direction);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
export async function deleteLessonAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('That lesson is not valid.');
    await removeLesson(user.id, id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

// assignments
export const createAssignmentAction: FormAction = formAction(assignmentInput, async (u, d) =>
  createAssignment(u, d, await taskContext(u))
);
export async function setAssignmentDoneAction(id: string, done: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('That assignment is not valid.');
    await setAssignmentDone(user.id, id, done, await taskContext(user.id));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
export async function deleteAssignmentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeAssignment(user.id, parsed.data.id);
  refresh();
}

// notes and resources
export const createStudyNoteAction: FormAction = formAction(studyNoteInput, (u, d) =>
  createStudyNote(u, d)
);
export const updateStudyNoteAction: FormAction = formAction(studyNoteInput, (u, d, v) =>
  updateStudyNote(u, idOf(v), d)
);
export async function deleteStudyNoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeStudyNote(user.id, parsed.data.id);
  refresh();
}
export const createResourceAction: FormAction = formAction(resourceInput, (u, d) =>
  createResource(u, d)
);
export async function deleteResourceAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeResource(user.id, parsed.data.id);
  refresh();
}

// sessions and the timer
export const logSessionAction: FormAction = formAction(sessionInput, async (u, d) =>
  logSession(u, d, (await getPreferences(u)).timeZone)
);
export async function deleteSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeSession(user.id, parsed.data.id);
  refresh();
}

export async function startPomodoroAction(
  input: unknown
): Promise<ActionResult<{ sessionId: string; startedAt: string }>> {
  try {
    const user = await requireUser();
    const parsed = pomodoroStartInput.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await startPomodoroSession(user.id, parsed.data);
    refresh();
    return ok({ sessionId: row.id, startedAt: row.startedAt.toISOString() });
  } catch (e) {
    return fromError(e);
  }
}

export async function stopPomodoroAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = pomodoroStopInput.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    await stopPomodoroSession(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
