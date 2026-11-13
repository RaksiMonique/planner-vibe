import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BookMarkedIcon,
  GraduationCapIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  Trash2Icon,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentDot } from '@/components/shared/segment-badge';
import { listGoals } from '@/features/goals/queries';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { deleteSubjectAction, setSubjectArchivedAction } from '@/features/study/actions';
import { AssignmentList } from '@/features/study/components/assignment-list';
import { PomodoroTimer } from '@/features/study/components/pomodoro-timer';
import {
  AssignmentFormDialog,
  CourseFormDialog,
  LogSessionDialog,
  ResourceFormDialog,
  StudyNoteFormDialog,
  SubjectFormDialog,
} from '@/features/study/components/study-forms';
import {
  CourseCard,
  NoteList,
  ResourceList,
  SessionList,
} from '@/features/study/components/study-lists';
import { formatMinutes, minutesBySubject, totalMinutes } from '@/features/study/progress';
import {
  getRunningStudySession,
  listAssignments,
  listCourses,
  listResources,
  listSessions,
  listStudyNotes,
  listSubjects,
} from '@/features/study/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone, weekRange } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Study planner' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;

export default async function StudyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const showAllCourses = params.status === 'all';
  const showArchived = params.archived === '1';

  const [segments, prefs] = await Promise.all([listSegments(user.id), getPreferences(user.id)]);
  const tz = prefs.timeZone;
  const today = todayInZone(tz);
  const todayKey = toDateKey(today);
  const { start, end } = weekRange(today, prefs.weekStartsOn);
  const weekFrom = fromZonedTime(`${toDateKey(start)}T00:00:00`, tz);
  const weekTo = fromZonedTime(`${toDateKey(addDays(end, 1))}T00:00:00`, tz);
  const learning = segments.find((s) => s.slug === 'learning');

  const [
    subjects,
    courses,
    assignments,
    recent,
    weekSessions,
    notes,
    resources,
    projects,
    running,
    goals,
  ] = await Promise.all([
    listSubjects(user.id, { includeArchived: showArchived }),
    listCourses(user.id, { status: showAllCourses ? 'all' : 'active' }),
    listAssignments(user.id, { open: true }),
    listSessions(user.id, { limit: 10 }),
    listSessions(user.id, { from: weekFrom, to: weekTo, limit: 500 }),
    listStudyNotes(user.id),
    listResources(user.id),
    listProjectOptions(user.id),
    getRunningStudySession(user.id),
    learning ? listGoals(user.id, { lifeSegmentId: learning.id }) : Promise.resolve([]),
  ]);

  const subjectOptions = subjects
    .filter((s) => s.archivedAt === null)
    .map((s) => ({ id: s.id, name: s.name, lifeSegmentId: s.lifeSegmentId }));
  const courseOptions = courses.map((c) => ({
    id: c.id,
    title: c.title,
    lifeSegmentId: c.lifeSegmentId,
    subjectId: c.subjectId,
  }));
  const weekMinutes = totalMinutes(weekSessions.filter((s) => s.endedAt !== null));
  const bySubject = minutesBySubject(weekSessions.filter((s) => s.endedAt !== null));
  const nowLocal = formatInTimeZone(new Date(), tz, "yyyy-MM-dd'T'HH:mm");
  const looseNotes = notes.filter((n) => !n.courseId);
  const looseResources = resources.filter((r) => !r.courseId);

  return (
    <>
      <PageHeader
        title="Study planner"
        description="Subjects, courses and lessons, with a Pomodoro timer that also tracks your time."
        actions={
          <>
            <LogSessionDialog
              segments={segments}
              subjects={subjectOptions}
              courses={courseOptions}
              nowLocal={nowLocal}
              variant="outline"
              trigger="Log session"
            />
            <SubjectFormDialog
              segments={segments}
              variant="outline"
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  Subject
                </>
              }
            />
            <CourseFormDialog
              segments={segments}
              subjects={subjectOptions}
              projects={projects}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New course
                </>
              }
            />
          </>
        }
      />

      <div className="flex flex-col gap-8">
        <PomodoroTimer
          segments={segments}
          subjects={subjectOptions}
          courses={courseOptions}
          defaultSegmentId={learning?.id}
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

        <div className="grid gap-4 lg:grid-cols-3">
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">This week</p>
              <p className="font-heading text-2xl">{formatMinutes(weekMinutes)}</p>
              {bySubject.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-1">
                  {bySubject.slice(0, 4).map((row) => (
                    <li key={row.key} className="flex flex-col gap-0.5 text-xs">
                      <span className="flex justify-between">
                        <span className="truncate">{row.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatMinutes(row.minutes)}
                        </span>
                      </span>
                      <span className="bg-muted h-1 overflow-hidden rounded-full">
                        <span
                          className="bg-primary block h-full"
                          style={{
                            width: `${Math.round((row.minutes / Math.max(1, weekMinutes)) * 100)}%`,
                          }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-xs">No study time logged yet this week.</p>
              )}
            </CardContent>
          </Card>
          <Link href="/goals?segment=learning" className="block">
            <Card size="sm" className="hover:bg-muted/40 h-full transition-colors">
              <CardContent className="flex flex-col gap-1">
                <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
                  Learning goals
                </p>
                <p className="font-heading flex items-center gap-2 text-2xl">
                  <TargetIcon className="text-primary size-5" aria-hidden />
                  {goals.length}
                </p>
                <p className="text-muted-foreground text-xs">
                  {goals.length === 0
                    ? 'Set a goal in the Education & Learning segment.'
                    : 'Open the goals page.'}
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/media/reading" className="block">
            <Card size="sm" className="hover:bg-muted/40 h-full transition-colors">
              <CardContent className="flex flex-col gap-1">
                <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
                  Reading list
                </p>
                <p className="font-heading flex items-center gap-2 text-2xl">
                  <BookMarkedIcon className="text-primary size-5" aria-hidden />
                  Books
                </p>
                <p className="text-muted-foreground text-xs">
                  What you are reading, want to read and have finished.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-xl">Subjects</h3>
            <Link
              href={showArchived ? '/study' : '/study?archived=1'}
              className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'ml-auto')}
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </Link>
          </div>
          {subjects.length === 0 ? (
            <EmptyState
              icon={GraduationCapIcon}
              title="No subjects yet"
              description="A subject groups courses, notes and resources, like Greek or Personal finance."
              action={<SubjectFormDialog segments={segments} trigger="New subject" />}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {subjects.map((s) => {
                const archived = s.archivedAt !== null;
                return (
                  <Card key={s.id} size="sm" className={cn(archived && 'opacity-70')}>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <SegmentDot accent={s.accent ?? s.segment.accent} className="mt-1.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-heading text-lg">{s.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {s.segment.name} · {s.courseActive} active of {s.courseTotal} course
                            {s.courseTotal === 1 ? '' : 's'}
                          </p>
                        </div>
                        <SubjectFormDialog
                          segments={segments}
                          subject={s}
                          variant="ghost"
                          size="icon-xs"
                          trigger={
                            <>
                              <PencilIcon />
                              <span className="sr-only">Edit subject</span>
                            </>
                          }
                        />
                      </div>
                      {s.description && (
                        <p className="text-muted-foreground text-sm">{s.description}</p>
                      )}
                      <div className="flex items-center gap-1">
                        <CourseFormDialog
                          segments={segments}
                          subjects={subjectOptions}
                          projects={projects}
                          defaultSubjectId={s.id}
                          variant="ghost"
                          size="xs"
                          trigger={
                            <>
                              <PlusIcon data-icon="inline-start" />
                              Course
                            </>
                          }
                        />
                        <form action={setSubjectArchivedAction} className="ml-auto">
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="archived" value={archived ? '' : 'on'} />
                          <Button type="submit" size="xs" variant="ghost">
                            {archived ? (
                              <ArchiveRestoreIcon data-icon="inline-start" />
                            ) : (
                              <ArchiveIcon data-icon="inline-start" />
                            )}
                            {archived ? 'Restore' : 'Archive'}
                          </Button>
                        </form>
                        <ConfirmActionButton
                          action={deleteSubjectAction}
                          fields={{ id: s.id }}
                          title={`Delete "${s.name}"?`}
                          description="Courses keep their data; they just lose the subject."
                          variant="ghost"
                          size="icon-xs"
                          trigger={
                            <>
                              <Trash2Icon />
                              <span className="sr-only">Delete subject</span>
                            </>
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-xl">Courses</h3>
            <Link
              href={showAllCourses ? '/study' : '/study?status=all'}
              className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'ml-auto')}
            >
              {showAllCourses ? 'Active only' : 'Include finished'}
            </Link>
          </div>
          {courses.length === 0 ? (
            <EmptyState
              icon={GraduationCapIcon}
              title={showAllCourses ? 'No courses yet' : 'No active courses'}
              description="Add a course, break it into lessons, and the progress bar follows."
              action={
                <CourseFormDialog
                  segments={segments}
                  subjects={subjectOptions}
                  projects={projects}
                  trigger="New course"
                />
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  segments={segments}
                  subjects={subjectOptions}
                  projects={projects}
                />
              ))}
            </div>
          )}
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
                <AssignmentList assignments={assignments} todayKey={todayKey} />
              </CardContent>
            </Card>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">Recent sessions</h3>
            <Card size="sm">
              <CardContent>
                <SessionList sessions={recent} timeZone={tz} />
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
            <NoteList notes={looseNotes} subjects={subjectOptions} courses={courseOptions} />
          </section>
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-xl">Resources</h3>
              <span className="ml-auto">
                <ResourceFormDialog
                  subjects={subjectOptions}
                  courses={courseOptions}
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
                <ResourceList resources={looseResources} />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
