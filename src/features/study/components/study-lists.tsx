import Link from 'next/link';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ExternalLinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ProjectOption } from '@/features/projects/queries';
import { cn } from '@/lib/utils';
import { deleteResourceAction, deleteSessionAction, deleteStudyNoteAction } from '../actions';
import { formatMinutes } from '../progress';
import type { CourseRow, LearningResource, SessionRow, StudyNote } from '../queries';
import { COURSE_STATUS_LABELS, RESOURCE_KIND_LABELS, SESSION_KIND_LABELS } from '../schema';
import {
  CourseFormDialog,
  StudyNoteFormDialog,
  type CourseOption,
  type SubjectOption,
} from './study-forms';

export function CourseCard({
  course,
  segments,
  subjects,
  projects,
}: {
  course: CourseRow;
  segments: SegmentRef[];
  subjects: SubjectOption[];
  projects: ProjectOption[];
}) {
  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-start gap-2">
          <SegmentDot accent={course.segment.accent} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/study/courses/${course.id}`}
              className="font-heading text-lg hover:underline"
            >
              {course.title}
            </Link>
            <p className="text-muted-foreground text-xs">
              {[course.subjectName, course.provider].filter(Boolean).join(' · ') ||
                course.segment.name}
            </p>
          </div>
          <Badge variant={course.status === 'in_progress' ? 'secondary' : 'outline'}>
            {COURSE_STATUS_LABELS[course.status]}
          </Badge>
        </div>
        <ProgressBar
          value={course.completion}
          valueText={
            course.lessonTotal > 0
              ? `${course.completion}% · ${course.lessonDone} of ${course.lessonTotal} lessons`
              : `${course.completion}%`
          }
        />
        <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {course.dueDate && (
            <span>Due {format(new Date(`${course.dueDate}T00:00:00`), 'd MMM yyyy')}</span>
          )}
          {course.projectId && (
            <Link href={`/projects/${course.projectId}`} className="text-primary hover:underline">
              Project
            </Link>
          )}
          <span className="ml-auto">
            <CourseFormDialog
              segments={segments}
              subjects={subjects}
              projects={projects}
              course={course}
              variant="ghost"
              size="icon-xs"
              trigger={
                <>
                  <PencilIcon />
                  <span className="sr-only">Edit course</span>
                </>
              }
            />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoteList({
  notes,
  subjects,
  courses,
}: {
  notes: StudyNote[];
  subjects: SubjectOption[];
  courses: CourseOption[];
}) {
  if (notes.length === 0) return <p className="text-muted-foreground text-sm">No notes yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {notes.map((n) => (
        <li key={n.id} className="bg-card flex flex-col gap-1 rounded-lg border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{n.title}</span>
            <StudyNoteFormDialog
              subjects={subjects}
              courses={courses}
              note={n}
              variant="ghost"
              size="icon-xs"
              trigger={
                <>
                  <PencilIcon />
                  <span className="sr-only">Edit note</span>
                </>
              }
            />
            <ConfirmActionButton
              action={deleteStudyNoteAction}
              fields={{ id: n.id }}
              title="Delete this note?"
              variant="ghost"
              size="icon-xs"
              trigger={
                <>
                  <Trash2Icon />
                  <span className="sr-only">Delete note</span>
                </>
              }
            />
          </div>
          {n.content && (
            <p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-line">
              {n.content}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ResourceList({ resources }: { resources: LearningResource[] }) {
  if (resources.length === 0)
    return <p className="text-muted-foreground text-sm">No resources yet.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {resources.map((r) => (
        <li key={r.id} className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{RESOURCE_KIND_LABELS[r.kind]}</Badge>
          {r.url ? (
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex min-w-0 flex-1 items-center gap-1 truncate hover:underline"
            >
              {r.title}
              <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
            </a>
          ) : (
            <span className="min-w-0 flex-1 truncate">{r.title}</span>
          )}
          {r.note && (
            <span className="text-muted-foreground hidden truncate text-xs sm:inline">
              {r.note}
            </span>
          )}
          <ConfirmActionButton
            action={deleteResourceAction}
            fields={{ id: r.id }}
            title="Remove this resource?"
            confirmLabel="Remove"
            variant="ghost"
            size="icon-xs"
            trigger={
              <>
                <Trash2Icon />
                <span className="sr-only">Remove resource</span>
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}

export function SessionList({
  sessions,
  timeZone,
  showCourse = true,
}: {
  sessions: SessionRow[];
  timeZone: string;
  showCourse?: boolean;
}) {
  if (sessions.length === 0)
    return <p className="text-muted-foreground text-sm">No sessions logged yet.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground w-24 shrink-0 text-xs">
            {formatInTimeZone(s.startedAt, timeZone, 'EEE d MMM')}
          </span>
          <span className={cn('min-w-0 flex-1 truncate', !s.endedAt && 'text-primary')}>
            {s.endedAt ? SESSION_KIND_LABELS[s.kind] : 'Running'}
            {showCourse && (s.courseTitle || s.subjectName) && (
              <span className="text-muted-foreground"> · {s.courseTitle ?? s.subjectName}</span>
            )}
            {s.note && <span className="text-muted-foreground"> · {s.note}</span>}
          </span>
          {s.pomodoros > 0 && <Badge variant="outline">{s.pomodoros} 🍅</Badge>}
          <span className="text-muted-foreground text-xs tabular-nums">
            {s.durationMinutes ? formatMinutes(s.durationMinutes) : '…'}
          </span>
          <ConfirmActionButton
            action={deleteSessionAction}
            fields={{ id: s.id }}
            title="Delete this session?"
            description="The matching time entry stays in time tracking."
            variant="ghost"
            size="icon-xs"
            trigger={
              <>
                <Trash2Icon />
                <span className="sr-only">Delete session</span>
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}
