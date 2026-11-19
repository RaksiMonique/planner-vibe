import Link from 'next/link';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { GraduationCapIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { dueAssignments } from '../due';
import { listAssignments, listSubjects } from '../queries';

const PREVIEW = 4;

function dueLabel(dueDate: string | null, todayKey: string): string {
  if (!dueDate) return 'No date';
  const days = differenceInCalendarDays(parseISO(dueDate), parseISO(todayKey));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return format(parseISO(dueDate), 'EEE d MMM');
}

/** The next assignments due, with their subject, and how many are overdue. */
export async function StudyDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const [assignments, subjects] = await Promise.all([
    listAssignments(userId, { open: true }),
    listSubjects(userId, { includeArchived: true }),
  ]);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const { shown, overdue, more } = dueAssignments(assignments, todayKey, PREVIEW);

  return (
    <DashboardCard title="Study planner" icon={GraduationCapIcon} href="/study" release={6}>
      {assignments.length === 0 ? (
        <EmptyNote>
          Nothing scheduled.{' '}
          <Link href="/study" className="text-primary link">
            Add an assignment.
          </Link>
        </EmptyNote>
      ) : (
        <>
          {overdue > 0 && (
            <p className="text-destructive text-xs">
              {overdue} overdue{' '}
              <Link href="/study" className="link">
                on the Study page
              </Link>
              .
            </p>
          )}
          {shown.length === 0 ? (
            <EmptyNote>Nothing else is due.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((a) => {
                const subject = a.subjectId ? subjectById.get(a.subjectId) : undefined;
                const accent = subject?.accent ?? subject?.segment.accent;
                const context = subject?.name ?? a.courseTitle;
                return (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    {accent ? (
                      <SegmentDot accent={accent} className="mt-1.5" />
                    ) : (
                      <span className="bg-border mt-1.5 inline-block size-2.5 shrink-0 rounded-full" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{a.title}</span>
                      {context && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {context}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {dueLabel(a.dueDate, todayKey)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {more > 0 && (
            <Link href="/study" className="text-primary link text-xs">
              {more} more on the Study page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
