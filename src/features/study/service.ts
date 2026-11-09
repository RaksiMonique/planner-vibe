import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { fromZonedTime } from 'date-fns-tz';
import { db } from '@/db';
import {
  assignments,
  courses,
  learningResources,
  lessons,
  lifeSegments,
  projects,
  studyNotes,
  studySessions,
  subjects,
} from '@/db/schema';
import { taskInput } from '@/features/tasks/schema';
import {
  completeTask,
  createTask,
  removeTask,
  uncompleteTask,
  type TaskContext,
} from '@/features/tasks/service';
import { entryInput } from '@/features/time/schema';
import { createEntry, startTimer, stopTimer } from '@/features/time/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { Assignment, Course, Lesson, StudyNote, StudySession, Subject } from './queries';
import type {
  AssignmentInput,
  CourseInput,
  LessonInput,
  PomodoroStartInput,
  PomodoroStopInput,
  ResourceInput,
  SessionInput,
  StudyNoteInput,
  SubjectInput,
} from './schema';

// ───────────────────────── ownership checks ─────────────────────────

async function assertSegment(userId: string, lifeSegmentId: string) {
  const n = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (n === 0) throw new ValidationError('That Life Segment does not exist.');
}

async function assertRefs(
  userId: string,
  refs: { subjectId?: string; courseId?: string; lessonId?: string; projectId?: string }
) {
  if (refs.subjectId) await getSubjectOrThrow(userId, refs.subjectId);
  if (refs.courseId) await getCourseOrThrow(userId, refs.courseId);
  if (refs.lessonId) await getLessonOrThrow(userId, refs.lessonId);
  if (refs.projectId) {
    const n = await db.$count(
      projects,
      and(eq(projects.id, refs.projectId), eq(projects.userId, userId))
    );
    if (n === 0) throw new ValidationError('That project does not exist.');
  }
}

export async function getSubjectOrThrow(userId: string, id: string): Promise<Subject> {
  const [row] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.id, id), isNull(subjects.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That subject does not exist.');
  return row;
}

export async function getCourseOrThrow(userId: string, id: string): Promise<Course> {
  const [row] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.userId, userId), eq(courses.id, id), isNull(courses.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That course does not exist.');
  return row;
}

export async function getLessonOrThrow(userId: string, id: string): Promise<Lesson> {
  const [row] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.userId, userId), eq(lessons.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That lesson does not exist.');
  return row;
}

async function getAssignmentOrThrow(userId: string, id: string): Promise<Assignment> {
  const [row] = await db
    .select()
    .from(assignments)
    .where(
      and(eq(assignments.userId, userId), eq(assignments.id, id), isNull(assignments.deletedAt))
    )
    .limit(1);
  if (!row) throw new NotFoundError('That assignment does not exist.');
  return row;
}

async function getSessionOrThrow(userId: string, id: string): Promise<StudySession> {
  const [row] = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That study session does not exist.');
  return row;
}

// ───────────────────────── subjects ─────────────────────────

export async function createSubject(userId: string, input: SubjectInput): Promise<Subject> {
  await assertSegment(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(subjects)
    .values({
      userId,
      name: input.name,
      lifeSegmentId: input.lifeSegmentId,
      description: input.description ?? null,
      accent: input.accent ?? null,
    })
    .returning();
  return row;
}

export async function updateSubject(userId: string, id: string, input: SubjectInput) {
  await getSubjectOrThrow(userId, id);
  await assertSegment(userId, input.lifeSegmentId);
  await db
    .update(subjects)
    .set({
      name: input.name,
      lifeSegmentId: input.lifeSegmentId,
      description: input.description ?? null,
      accent: input.accent ?? null,
    })
    .where(and(eq(subjects.userId, userId), eq(subjects.id, id)));
}

export async function setSubjectArchived(userId: string, id: string, archived: boolean) {
  await getSubjectOrThrow(userId, id);
  await db
    .update(subjects)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(subjects.userId, userId), eq(subjects.id, id)));
}

export async function removeSubject(userId: string, id: string) {
  await getSubjectOrThrow(userId, id);
  await db
    .update(subjects)
    .set({ deletedAt: new Date(), archivedAt: new Date() })
    .where(and(eq(subjects.userId, userId), eq(subjects.id, id)));
}

// ───────────────────────── courses and lessons ─────────────────────────

function courseValues(input: CourseInput) {
  return {
    title: input.title,
    lifeSegmentId: input.lifeSegmentId,
    subjectId: input.subjectId ?? null,
    projectId: input.projectId ?? null,
    provider: input.provider || null,
    url: input.url || null,
    status: input.status,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    progress: input.progress,
    notes: input.notes ?? null,
  };
}

export async function createCourse(userId: string, input: CourseInput): Promise<Course> {
  await assertSegment(userId, input.lifeSegmentId);
  await assertRefs(userId, input);
  const [row] = await db
    .insert(courses)
    .values({ ...courseValues(input), userId })
    .returning();
  return row;
}

export async function updateCourse(userId: string, id: string, input: CourseInput) {
  await getCourseOrThrow(userId, id);
  await assertSegment(userId, input.lifeSegmentId);
  await assertRefs(userId, input);
  await db
    .update(courses)
    .set(courseValues(input))
    .where(and(eq(courses.userId, userId), eq(courses.id, id)));
}

export async function setCourseStatus(userId: string, id: string, status: Course['status']) {
  await getCourseOrThrow(userId, id);
  await db
    .update(courses)
    .set({ status })
    .where(and(eq(courses.userId, userId), eq(courses.id, id)));
}

export async function removeCourse(userId: string, id: string) {
  await getCourseOrThrow(userId, id);
  await db
    .update(courses)
    .set({ deletedAt: new Date() })
    .where(and(eq(courses.userId, userId), eq(courses.id, id)));
}

export async function addLesson(userId: string, input: LessonInput): Promise<Lesson> {
  await getCourseOrThrow(userId, input.courseId);
  const existing = await db.$count(lessons, eq(lessons.courseId, input.courseId));
  const [row] = await db
    .insert(lessons)
    .values({
      userId,
      courseId: input.courseId,
      title: input.title,
      durationMinutes: input.durationMinutes ?? null,
      sortOrder: existing,
    })
    .returning();
  return row;
}

export async function setLessonDone(userId: string, id: string, done: boolean) {
  await getLessonOrThrow(userId, id);
  await db
    .update(lessons)
    .set({ completedAt: done ? new Date() : null })
    .where(and(eq(lessons.userId, userId), eq(lessons.id, id)));
}

export async function removeLesson(userId: string, id: string) {
  const lesson = await getLessonOrThrow(userId, id);
  await db.delete(lessons).where(and(eq(lessons.userId, userId), eq(lessons.id, id)));
  await renumberLessons(userId, lesson.courseId);
}

/** Swaps the lesson with its neighbour in the given direction. */
export async function moveLesson(userId: string, id: string, direction: 'up' | 'down') {
  const lesson = await getLessonOrThrow(userId, id);
  const siblings = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.userId, userId), eq(lessons.courseId, lesson.courseId)))
    .orderBy(asc(lessons.sortOrder), asc(lessons.createdAt));
  const index = siblings.findIndex((l) => l.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return;
  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await Promise.all(
    reordered.map((l, i) =>
      db
        .update(lessons)
        .set({ sortOrder: i })
        .where(and(eq(lessons.userId, userId), eq(lessons.id, l.id)))
    )
  );
}

async function renumberLessons(userId: string, courseId: string) {
  const rows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.userId, userId), eq(lessons.courseId, courseId)))
    .orderBy(asc(lessons.sortOrder), asc(lessons.createdAt));
  await Promise.all(
    rows.map((l, i) =>
      db
        .update(lessons)
        .set({ sortOrder: i })
        .where(and(eq(lessons.userId, userId), eq(lessons.id, l.id)))
    )
  );
}

// ───────────────────────── assignments ─────────────────────────

/** An assignment with a due date is mirrored as a task in the same segment (instructions.md 7.7). */
export async function createAssignment(
  userId: string,
  input: AssignmentInput,
  ctx: TaskContext
): Promise<Assignment> {
  await assertSegment(userId, input.lifeSegmentId);
  await assertRefs(userId, input);
  let taskId: string | null = null;
  if (input.dueDate) {
    const task = await createTask(
      userId,
      taskInput.parse({
        title: input.title,
        lifeSegmentId: input.lifeSegmentId,
        dueDate: input.dueDate,
        notes: input.notes,
      }),
      ctx
    );
    taskId = task.id;
  }
  const [row] = await db
    .insert(assignments)
    .values({
      userId,
      title: input.title,
      lifeSegmentId: input.lifeSegmentId,
      courseId: input.courseId ?? null,
      subjectId: input.subjectId ?? null,
      dueDate: input.dueDate ?? null,
      notes: input.notes ?? null,
      taskId,
    })
    .returning();
  return row;
}

export async function setAssignmentDone(
  userId: string,
  id: string,
  done: boolean,
  ctx: TaskContext
) {
  const row = await getAssignmentOrThrow(userId, id);
  await db
    .update(assignments)
    .set({ completedAt: done ? new Date() : null })
    .where(and(eq(assignments.userId, userId), eq(assignments.id, id)));
  if (row.taskId) {
    try {
      if (done) await completeTask(userId, row.taskId, ctx);
      else await uncompleteTask(userId, row.taskId);
    } catch (e) {
      // The mirrored task may have been deleted from the tasks page; the assignment still updates.
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
}

export async function removeAssignment(userId: string, id: string) {
  const row = await getAssignmentOrThrow(userId, id);
  await db
    .update(assignments)
    .set({ deletedAt: new Date() })
    .where(and(eq(assignments.userId, userId), eq(assignments.id, id)));
  if (row.taskId) {
    try {
      await removeTask(userId, row.taskId);
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
}

// ───────────────────────── notes and resources ─────────────────────────

export async function createStudyNote(userId: string, input: StudyNoteInput): Promise<StudyNote> {
  await assertRefs(userId, input);
  const [row] = await db
    .insert(studyNotes)
    .values({
      userId,
      title: input.title,
      content: input.content ?? null,
      subjectId: input.subjectId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
    })
    .returning();
  return row;
}

export async function updateStudyNote(userId: string, id: string, input: StudyNoteInput) {
  await assertRefs(userId, input);
  const n = await db.$count(studyNotes, and(eq(studyNotes.id, id), eq(studyNotes.userId, userId)));
  if (n === 0) throw new NotFoundError('That note does not exist.');
  await db
    .update(studyNotes)
    .set({
      title: input.title,
      content: input.content ?? null,
      subjectId: input.subjectId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
    })
    .where(and(eq(studyNotes.userId, userId), eq(studyNotes.id, id)));
}

export async function removeStudyNote(userId: string, id: string) {
  await db
    .update(studyNotes)
    .set({ deletedAt: new Date() })
    .where(and(eq(studyNotes.userId, userId), eq(studyNotes.id, id)));
}

export async function createResource(userId: string, input: ResourceInput) {
  await assertRefs(userId, input);
  await db.insert(learningResources).values({
    userId,
    title: input.title,
    kind: input.kind,
    url: input.url || null,
    note: input.note ?? null,
    subjectId: input.subjectId ?? null,
    courseId: input.courseId ?? null,
  });
}

export async function removeResource(userId: string, id: string) {
  await db
    .delete(learningResources)
    .where(and(eq(learningResources.userId, userId), eq(learningResources.id, id)));
}

// ───────────────────────── sessions and the Pomodoro timer ─────────────────────────

/** Logs a session by hand and records it as a time entry too, so time tracking sees it. */
export async function logSession(
  userId: string,
  input: SessionInput,
  timeZone: string
): Promise<StudySession> {
  await assertSegment(userId, input.lifeSegmentId);
  await assertRefs(userId, input);
  const entry = await createEntry(
    userId,
    entryInput.parse({
      lifeSegmentId: input.lifeSegmentId,
      startedAt: input.startedAt,
      durationMinutes: input.durationMinutes,
      note: input.note ?? 'Study session',
    }),
    timeZone
  );
  const startedAt = fromZonedTime(input.startedAt, timeZone);
  const [row] = await db
    .insert(studySessions)
    .values({
      userId,
      lifeSegmentId: input.lifeSegmentId,
      subjectId: input.subjectId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      timeEntryId: entry.id,
      kind: input.kind,
      startedAt,
      endedAt: new Date(startedAt.getTime() + input.durationMinutes * 60_000),
      durationMinutes: input.durationMinutes,
      note: input.note ?? null,
    })
    .returning();
  return row;
}

export async function removeSession(userId: string, id: string) {
  await getSessionOrThrow(userId, id);
  await db
    .delete(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.id, id)));
}

/** Starts a Pomodoro session; the time feature's timer starts with it (instructions.md 8.3). */
export async function startPomodoroSession(
  userId: string,
  input: PomodoroStartInput
): Promise<StudySession> {
  await assertSegment(userId, input.lifeSegmentId);
  await assertRefs(userId, input);
  const entry = await startTimer(userId, { lifeSegmentId: input.lifeSegmentId, note: 'Pomodoro' });
  const [row] = await db
    .insert(studySessions)
    .values({
      userId,
      lifeSegmentId: input.lifeSegmentId,
      subjectId: input.subjectId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      timeEntryId: entry.id,
      kind: 'pomodoro',
      startedAt: entry.startedAt,
      endedAt: null,
      durationMinutes: null,
      pomodoros: 0,
    })
    .returning();
  return row;
}

export async function stopPomodoroSession(
  userId: string,
  input: PomodoroStopInput
): Promise<StudySession> {
  const session = await getSessionOrThrow(userId, input.sessionId);
  if (session.endedAt) return session;
  let endedAt = new Date();
  if (session.timeEntryId) {
    try {
      const entry = await stopTimer(userId, session.timeEntryId);
      endedAt = entry.endedAt ?? endedAt;
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
  const [row] = await db
    .update(studySessions)
    .set({
      endedAt,
      durationMinutes: Math.max(
        1,
        Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60_000)
      ),
      pomodoros: input.pomodoros,
      note: input.note ?? session.note,
    })
    .where(and(eq(studySessions.userId, userId), eq(studySessions.id, input.sessionId)))
    .returning();
  return row;
}
