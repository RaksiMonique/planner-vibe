import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { deleteCourseAction, setCourseStatusAction } from '@/features/study/actions';
import { AssignmentList } from '@/features/study/components/assignment-list';
import { LessonList } from '@/features/study/components/lesson-list';
import { PomodoroTimer } from '@/features/study/components/pomodoro-timer';
import {
  AssignmentFormDialog,
  CourseFormDialog,
  LogSessionDialog,
  ResourceFormDialog,
  StudyNoteFormDialog,
} from '@/features/study/components/study-forms';
import { NoteList, ResourceList, SessionList } from '@/features/study/components/study-lists';
import {
  getCourseRow,
  getRunningStudySession,
  listAssignments,
  listCourses,
  listLessons,
  listResources,
  listSessions,
  listStudyNotes,
  listSubjects,
} from '@/features/study/queries';
import { COURSE_STATUS_LABELS, COURSE_STATUSES } from '@/features/study/schema';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Course' };
export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const course = await getCourseRow(user.id, id);
  if (!course) notFound();

  const [
    segments,
    prefs,
    subjects,
    allCourses,
    projects,
    lessons,
    assignments,
    notes,
    resources,
    sessions,
    running,
  ] = await Promise.all([
    listSegments(user.id),
    getPreferences(user.id),
    listSubjects(user.id),
    listCourses(user.id, { status: 'all' }),
    listProjectOptions(user.id),
    listLessons(user.id, id),
    listAssignments(user.id, { courseId: id }),
    listStudyNotes(user.id, { courseId: id }),
    listResources(user.id, { courseId: id }),
    listSessions(user.id, { courseId: id, limit: 20 }),
    getRunningStudySession(user.id),
  ]);
  const tz = prefs.timeZone;
  const todayKey = toDateKey(todayInZone(tz));
  const subjectOptions = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    lifeSegmentId: s.lifeSegmentId,
  }));
  const courseOptions = allCourses.map((c) => ({
    id: c.id,
    title: c.title,
    lifeSegmentId: c.lifeSegmentId,
    subjectId: c.subjectId,
  }));
  const nowLocal = formatInTimeZone(new Date(), tz, "yyyy-MM-dd'T'HH:mm");
  const dateLabel = (d: string | null) =>
    d ? format(new Date(`${d}T00:00:00`), 'd MMM yyyy') : null;

  return (
    <>
      <div className="mb-3 text-sm">
        <Link href="/study" className="text-primary hover:underline">
          Study planner
        </Link>
        <span className="text-muted-foreground"> / {course.subjectName ?? 'Courses'}</span>
      </div>
      <PageHeader
        title={course.title}
        description={[course.provider, course.subjectName].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <form action={setCourseStatusAction} className="flex items-center gap-1">
              <input type="hidden" name="id" value={course.id} />
              <NativeSelect
                name="status"
                defaultValue={course.status}
                aria-label="Course status"
                className="w-auto"
              >
                {COURSE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {COURSE_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="sm" variant="ghost">
                Set
              </Button>
            </form>
            <CourseFormDialog
              segments={segments}
              subjects={subjectOptions}
              projects={projects}
              course={course}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <ConfirmActionButton
              action={deleteCourseAction}
              fields={{ id: course.id }}
              title={`Delete "${course.title}"?`}
              description="Lessons go with it. Assignments and sessions keep their records."
              variant="ghost"
              trigger={
                <>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </>
              }
            />
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <SegmentBadge name={course.segment.name} accent={course.segment.accent} />
              <Badge variant={course.status === 'in_progress' ? 'secondary' : 'outline'}>
                {COURSE_STATUS_LABELS[course.status]}
              </Badge>
              {course.startDate && (
                <span className="text-muted-foreground">Started {dateLabel(course.startDate)}</span>
              )}
              {course.dueDate && (
                <span
                  className={cn(
                    'text-muted-foreground',
                    course.dueDate < todayKey && course.status !== 'done' && 'text-destructive'
                  )}
                >
                  Due {dateLabel(course.dueDate)}
                </span>
              )}
              {course.url && (
                <a
                  href={course.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Open course <ExternalLinkIcon className="size-3" aria-hidden />
                </a>
              )}
              {course.projectId && (
                <Link
                  href={`/projects/${course.projectId}`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'ml-auto')}
                >
                  Project workspace
                </Link>
              )}
            </div>
            <ProgressBar
              value={course.completion}
              label="Progress"
              valueText={
                course.lessonTotal > 0
                  ? `${course.completion}% · ${course.lessonDone} of ${course.lessonTotal} lessons`
                  : `${course.completion}%`
              }
            />
            {course.notes && (
              <p className="text-muted-foreground text-sm whitespace-pre-line">{course.notes}</p>
            )}
          </CardContent>
        </Card>

        <PomodoroTimer
          segments={segments}
          subjects={subjectOptions}
          courses={courseOptions}
          defaultCourseId={course.id}
          defaultSegmentId={course.lifeSegmentId}
          running={
            running
              ? {
                  sessionId: running.id,
                  startedAt: running.startedAt.toISOString(),
                  label: running.courseTitle ?? running.subjectName ?? 'Study',
                }
              : null
          }
        />

        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-xl">Lessons</h3>
          <Card size="sm">
            <CardContent>
              <LessonList courseId={course.id} lessons={lessons} />
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-xl">Assignments</h3>
              <span className="ml-auto">
                <AssignmentFormDialog
                  segments={segments}
                  subjects={subjectOptions}
                  courses={courseOptions}
                  defaultCourseId={course.id}
                  variant="outline"
                  size="xs"
                  trigger={
                    <>
                      <PlusIcon data-icon="inline-start" />
                      Assignment
                    </>
                  }
                />
              </span>
            </div>
            <Card size="sm">
              <CardContent>
                <AssignmentList assignments={assignments} todayKey={todayKey} showCourse={false} />
              </CardContent>
            </Card>
          </section>
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-xl">Sessions</h3>
              <span className="ml-auto">
                <LogSessionDialog
                  segments={segments}
                  subjects={subjectOptions}
                  courses={courseOptions}
                  defaultCourseId={course.id}
                  nowLocal={nowLocal}
                  variant="outline"
                  size="xs"
                  trigger="Log session"
                />
              </span>
            </div>
            <Card size="sm">
              <CardContent>
                <SessionList sessions={sessions} timeZone={tz} showCourse={false} />
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-xl">Notes</h3>
              <span className="ml-auto">
                <StudyNoteFormDialog
                  subjects={subjectOptions}
                  courses={courseOptions}
                  defaultCourseId={course.id}
                  defaultSubjectId={course.subjectId ?? undefined}
                  variant="outline"
                  size="xs"
                  trigger={
                    <>
                      <PlusIcon data-icon="inline-start" />
                      Note
                    </>
                  }
                />
              </span>
            </div>
            <NoteList notes={notes} subjects={subjectOptions} courses={courseOptions} />
          </section>
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-xl">Resources</h3>
              <span className="ml-auto">
                <ResourceFormDialog
                  subjects={subjectOptions}
                  courses={courseOptions}
                  defaultCourseId={course.id}
                  defaultSubjectId={course.subjectId ?? undefined}
                  variant="outline"
                  size="xs"
                  trigger={
                    <>
                      <PlusIcon data-icon="inline-start" />
                      Resource
                    </>
                  }
                />
              </span>
            </div>
            <Card size="sm">
              <CardContent>
                <ResourceList resources={resources} />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
