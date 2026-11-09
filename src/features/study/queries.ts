import 'server-only';
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assignments,
  courses,
  learningResources,
  lessons,
  lifeSegments,
  studyNotes,
  studySessions,
  subjects,
  tasks,
} from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import { courseProgress } from './progress';

export type Subject = typeof subjects.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type StudyNote = typeof studyNotes.$inferSelect;
export type LearningResource = typeof learningResources.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;

export type SubjectRow = Subject & {
  segment: SegmentRef;
  courseTotal: number;
  courseActive: number;
};
export type CourseRow = Course & {
  segment: SegmentRef;
  subjectName: string | null;
  lessonTotal: number;
  lessonDone: number;
  /** Computed on read, see progress.ts. */
  completion: number;
};
export type AssignmentRow = Assignment & {
  courseTitle: string | null;
  /** Done here or through the mirrored task. */
  done: boolean;
};
export type SessionRow = StudySession & { subjectName: string | null; courseTitle: string | null };

export async function listSubjects(
  userId: string,
  opts: { includeArchived?: boolean } = {}
): Promise<SubjectRow[]> {
  const conds = [eq(subjects.userId, userId), isNull(subjects.deletedAt)];
  if (!opts.includeArchived) conds.push(isNull(subjects.archivedAt));
  const rows = await db
    .select({ subject: subjects, segment: segmentRefColumns })
    .from(subjects)
    .innerJoin(lifeSegments, eq(subjects.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(asc(subjects.name));
  const stats = await db
    .select({
      subjectId: courses.subjectId,
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${courses.status} in ('planned', 'in_progress'))::int`,
    })
    .from(courses)
    .where(
      and(
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
        sql`${courses.subjectId} is not null`
      )
    )
    .groupBy(courses.subjectId);
  const byId = new Map(stats.map((s) => [s.subjectId as string, s]));
  return rows.map(({ subject, segment }) => ({
    ...subject,
    segment,
    courseTotal: byId.get(subject.id)?.total ?? 0,
    courseActive: byId.get(subject.id)?.active ?? 0,
  }));
}

export async function listCourses(
  userId: string,
  filters: { subjectId?: string; status?: 'active' | 'all' } = {}
): Promise<CourseRow[]> {
  const conds = [eq(courses.userId, userId), isNull(courses.deletedAt)];
  if (filters.subjectId) conds.push(eq(courses.subjectId, filters.subjectId));
  if ((filters.status ?? 'active') === 'active') {
    conds.push(sql`${courses.status} in ('planned', 'in_progress')`);
  }
  const rows = await db
    .select({ course: courses, segment: segmentRefColumns, subjectName: subjects.name })
    .from(courses)
    .innerJoin(lifeSegments, eq(courses.lifeSegmentId, lifeSegments.id))
    .leftJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(and(...conds))
    .orderBy(asc(courses.dueDate), asc(courses.createdAt));
  if (rows.length === 0) return [];
  const lessonRows = await db
    .select({ courseId: lessons.courseId, completedAt: lessons.completedAt })
    .from(lessons)
    .where(
      and(
        eq(lessons.userId, userId),
        inArray(
          lessons.courseId,
          rows.map((r) => r.course.id)
        )
      )
    );
  return rows.map(({ course, segment, subjectName }) => {
    const mine = lessonRows.filter((l) => l.courseId === course.id);
    return {
      ...course,
      segment,
      subjectName,
      lessonTotal: mine.length,
      lessonDone: mine.filter((l) => l.completedAt !== null).length,
      completion: courseProgress(course, mine),
    };
  });
}

export async function getCourseRow(userId: string, id: string): Promise<CourseRow | null> {
  const all = await listCourses(userId, { status: 'all' });
  return all.find((c) => c.id === id) ?? null;
}

export async function listLessons(userId: string, courseId: string): Promise<Lesson[]> {
  return db
    .select()
    .from(lessons)
    .where(and(eq(lessons.userId, userId), eq(lessons.courseId, courseId)))
    .orderBy(asc(lessons.sortOrder), asc(lessons.createdAt));
}

export async function listAssignments(
  userId: string,
  filters: { courseId?: string; subjectId?: string; open?: boolean } = {}
): Promise<AssignmentRow[]> {
  const conds = [eq(assignments.userId, userId), isNull(assignments.deletedAt)];
  if (filters.courseId) conds.push(eq(assignments.courseId, filters.courseId));
  if (filters.subjectId) conds.push(eq(assignments.subjectId, filters.subjectId));
  if (filters.open) {
    conds.push(isNull(assignments.completedAt));
    conds.push(sql`(${tasks.status} is null or ${tasks.status} <> 'done')`);
  }
  const rows = await db
    .select({ assignment: assignments, courseTitle: courses.title, taskStatus: tasks.status })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .leftJoin(tasks, eq(assignments.taskId, tasks.id))
    .where(and(...conds))
    .orderBy(asc(assignments.dueDate), asc(assignments.createdAt));
  return rows.map(({ assignment, courseTitle, taskStatus }) => ({
    ...assignment,
    courseTitle,
    done: assignment.completedAt !== null || taskStatus === 'done',
  }));
}

export async function listStudyNotes(
  userId: string,
  filters: { subjectId?: string; courseId?: string; lessonId?: string } = {}
): Promise<StudyNote[]> {
  const conds = [eq(studyNotes.userId, userId), isNull(studyNotes.deletedAt)];
  if (filters.subjectId) conds.push(eq(studyNotes.subjectId, filters.subjectId));
  if (filters.courseId) conds.push(eq(studyNotes.courseId, filters.courseId));
  if (filters.lessonId) conds.push(eq(studyNotes.lessonId, filters.lessonId));
  return db
    .select()
    .from(studyNotes)
    .where(and(...conds))
    .orderBy(desc(studyNotes.updatedAt));
}

export async function listResources(
  userId: string,
  filters: { subjectId?: string; courseId?: string } = {}
): Promise<LearningResource[]> {
  const conds = [eq(learningResources.userId, userId)];
  if (filters.subjectId) conds.push(eq(learningResources.subjectId, filters.subjectId));
  if (filters.courseId) conds.push(eq(learningResources.courseId, filters.courseId));
  return db
    .select()
    .from(learningResources)
    .where(and(...conds))
    .orderBy(asc(learningResources.kind), asc(learningResources.title));
}

export async function listSessions(
  userId: string,
  filters: { from?: Date; to?: Date; courseId?: string; subjectId?: string; limit?: number } = {}
): Promise<SessionRow[]> {
  const conds = [eq(studySessions.userId, userId)];
  if (filters.from) conds.push(gte(studySessions.startedAt, filters.from));
  if (filters.to) conds.push(lt(studySessions.startedAt, filters.to));
  if (filters.courseId) conds.push(eq(studySessions.courseId, filters.courseId));
  if (filters.subjectId) conds.push(eq(studySessions.subjectId, filters.subjectId));
  const rows = await db
    .select({ session: studySessions, subjectName: subjects.name, courseTitle: courses.title })
    .from(studySessions)
    .leftJoin(subjects, eq(studySessions.subjectId, subjects.id))
    .leftJoin(courses, eq(studySessions.courseId, courses.id))
    .where(and(...conds))
    .orderBy(desc(studySessions.startedAt))
    .limit(filters.limit ?? 200);
  return rows.map(({ session, subjectName, courseTitle }) => ({
    ...session,
    subjectName,
    courseTitle,
  }));
}

/** The Pomodoro session still running, if any. */
export async function getRunningStudySession(userId: string): Promise<SessionRow | null> {
  const [row] = await db
    .select({ session: studySessions, subjectName: subjects.name, courseTitle: courses.title })
    .from(studySessions)
    .leftJoin(subjects, eq(studySessions.subjectId, subjects.id))
    .leftJoin(courses, eq(studySessions.courseId, courses.id))
    .where(and(eq(studySessions.userId, userId), isNull(studySessions.endedAt)))
    .orderBy(desc(studySessions.startedAt))
    .limit(1);
  return row
    ? { ...row.session, subjectName: row.subjectName, courseTitle: row.courseTitle }
    : null;
}
