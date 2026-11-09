'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SegmentDot } from '@/components/shared/segment-badge';
import { SubmitButton } from '@/components/shared/submit-button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import { ACCENT_LABELS, ACCENTS } from '@/features/life-segments/schema';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ProjectOption } from '@/features/projects/queries';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import {
  createAssignmentAction,
  createCourseAction,
  createResourceAction,
  createStudyNoteAction,
  createSubjectAction,
  logSessionAction,
  updateCourseAction,
  updateStudyNoteAction,
  updateSubjectAction,
} from '../actions';
import type { Course, StudyNote, Subject } from '../queries';
import {
  COURSE_STATUS_LABELS,
  COURSE_STATUSES,
  RESOURCE_KIND_LABELS,
  RESOURCE_KINDS,
  SESSION_KIND_LABELS,
  SESSION_KINDS,
} from '../schema';
import { FormDialog, useClosingAction } from './form-dialog';

export type SubjectOption = Pick<Subject, 'id' | 'name' | 'lifeSegmentId'>;
export type CourseOption = Pick<Course, 'id' | 'title' | 'lifeSegmentId' | 'subjectId'>;

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function ErrorLine({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {state.error}
    </p>
  );
}

function Footer({ label }: { label: string }) {
  return (
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
      <SubmitButton>{label}</SubmitButton>
    </DialogFooter>
  );
}

function useForm(action: FormAction, close: () => void) {
  return useActionState(useClosingAction(action, close), null);
}

// ───────────────────────── subject ─────────────────────────

export function SubjectFormDialog({
  segments,
  subject,
  trigger,
  variant,
  size,
}: {
  segments: SegmentRef[];
  subject?: Subject;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <FormDialog
      title={subject ? 'Edit subject' : 'New subject'}
      description="An area of learning that groups courses, notes and resources."
      trigger={trigger}
      variant={variant}
      size={size}
      className="sm:max-w-md"
    >
      {(close) => <SubjectForm segments={segments} subject={subject} close={close} />}
    </FormDialog>
  );
}

function SubjectForm({
  segments,
  subject,
  close,
}: {
  segments: SegmentRef[];
  subject?: Subject;
  close: () => void;
}) {
  const [state, formAction] = useForm(subject ? updateSubjectAction : createSubjectAction, close);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {subject && <input type="hidden" name="id" value={subject.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="subject-name">Name</FieldLabel>
          <Input
            id="subject-name"
            name="name"
            defaultValue={subject?.name}
            required
            maxLength={120}
            autoFocus
            placeholder="New Testament Greek"
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
          <FieldLabel htmlFor="subject-segment">Life Segment</FieldLabel>
          <SegmentSelect
            id="subject-segment"
            segments={segments}
            defaultValue={subject?.lifeSegmentId ?? segments.find((s) => s.slug === 'learning')?.id}
          />
          <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="subject-accent">Colour</FieldLabel>
          <ChoiceSelect
            id="subject-accent"
            name="accent"
            defaultValue={subject?.accent ?? 'segment'}
            options={[
              { value: 'segment', label: 'Same as the Life Segment' },
              ...ACCENTS.map((a) => ({
                value: a,
                label: (
                  <span className="flex items-center gap-2">
                    <SegmentDot accent={a} />
                    {ACCENT_LABELS[a]}
                  </span>
                ),
              })),
            ]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="subject-description">Description</FieldLabel>
          <Textarea
            id="subject-description"
            name="description"
            rows={2}
            defaultValue={subject?.description ?? ''}
          />
        </Field>
      </FieldGroup>
      <ErrorLine state={state} />
      <Footer label={subject ? 'Save changes' : 'Create subject'} />
    </form>
  );
}

// ───────────────────────── course ─────────────────────────

export function CourseFormDialog({
  segments,
  subjects,
  projects,
  course,
  defaultSubjectId,
  trigger,
  variant,
  size,
}: {
  segments: SegmentRef[];
  subjects: SubjectOption[];
  projects: ProjectOption[];
  course?: Course;
  defaultSubjectId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <FormDialog
      title={course ? 'Edit course' : 'New course'}
      description="A course or certification with a defined outcome. Lessons drive its progress."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => (
        <CourseForm
          segments={segments}
          subjects={subjects}
          projects={projects}
          course={course}
          defaultSubjectId={defaultSubjectId}
          close={close}
        />
      )}
    </FormDialog>
  );
}

function CourseForm({
  segments,
  subjects,
  projects,
  course,
  defaultSubjectId,
  close,
}: {
  segments: SegmentRef[];
  subjects: SubjectOption[];
  projects: ProjectOption[];
  course?: Course;
  defaultSubjectId?: string;
  close: () => void;
}) {
  const [state, formAction] = useForm(course ? updateCourseAction : createCourseAction, close);
  const defaultSubject = subjects.find((s) => s.id === (course?.subjectId ?? defaultSubjectId));
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {course && <input type="hidden" name="id" value={course.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="course-title">Title</FieldLabel>
          <Input
            id="course-title"
            name="title"
            defaultValue={course?.title}
            required
            maxLength={200}
            autoFocus
            placeholder="Introduction to TypeScript"
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="course-subject">Subject</FieldLabel>
            <NativeSelect
              id="course-subject"
              name="subjectId"
              defaultValue={defaultSubject?.id ?? ''}
            >
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="course-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="course-segment"
              segments={segments}
              defaultValue={
                course?.lifeSegmentId ??
                defaultSubject?.lifeSegmentId ??
                segments.find((s) => s.slug === 'learning')?.id
              }
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="course-provider">Provider</FieldLabel>
            <Input
              id="course-provider"
              name="provider"
              defaultValue={course?.provider ?? ''}
              maxLength={120}
              placeholder="Coursera"
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'url')}>
            <FieldLabel htmlFor="course-url">Link</FieldLabel>
            <Input
              id="course-url"
              name="url"
              type="url"
              defaultValue={course?.url ?? ''}
              placeholder="https://"
            />
            <FieldError errors={fieldErrors(state, 'url')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="course-status">Status</FieldLabel>
            <NativeSelect
              id="course-status"
              name="status"
              defaultValue={course?.status ?? 'planned'}
            >
              {COURSE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {COURSE_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="course-start">Start</FieldLabel>
            <Input
              id="course-start"
              name="startDate"
              type="date"
              defaultValue={course?.startDate ?? ''}
            />
          </Field>
          <Field data-invalid={hasFieldError(state, 'dueDate')}>
            <FieldLabel htmlFor="course-due">Due</FieldLabel>
            <Input
              id="course-due"
              name="dueDate"
              type="date"
              defaultValue={course?.dueDate ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'dueDate')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="course-project">Project</FieldLabel>
            <NativeSelect
              id="course-project"
              name="projectId"
              defaultValue={course?.projectId ?? ''}
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>Optional, for a course that is a real body of work.</FieldDescription>
          </Field>
          <Field data-invalid={hasFieldError(state, 'progress')}>
            <FieldLabel htmlFor="course-progress">Progress %</FieldLabel>
            <Input
              id="course-progress"
              name="progress"
              type="number"
              min={0}
              max={100}
              defaultValue={course?.progress ?? 0}
            />
            <FieldDescription>Used only while the course has no lessons.</FieldDescription>
            <FieldError errors={fieldErrors(state, 'progress')} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="course-notes">Notes</FieldLabel>
          <Textarea id="course-notes" name="notes" rows={2} defaultValue={course?.notes ?? ''} />
        </Field>
      </FieldGroup>
      <ErrorLine state={state} />
      <Footer label={course ? 'Save changes' : 'Create course'} />
    </form>
  );
}

// ───────────────────────── assignment ─────────────────────────

export function AssignmentFormDialog({
  segments,
  subjects,
  courses,
  defaultCourseId,
  defaultSubjectId,
  trigger,
  variant,
  size,
}: {
  segments: SegmentRef[];
  subjects: SubjectOption[];
  courses: CourseOption[];
  defaultCourseId?: string;
  defaultSubjectId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const course = courses.find((c) => c.id === defaultCourseId);
  return (
    <FormDialog
      title="New assignment"
      description="With a due date it also appears in Tasks and on the calendar."
      trigger={trigger}
      variant={variant}
      size={size}
      className="sm:max-w-md"
    >
      {(close) => {
        const Form = () => {
          const [state, formAction] = useForm(createAssignmentAction, close);
          return (
            <form action={formAction} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={hasFieldError(state, 'title')}>
                  <FieldLabel htmlFor="assignment-title">Title</FieldLabel>
                  <Input id="assignment-title" name="title" required maxLength={200} autoFocus />
                  <FieldError errors={fieldErrors(state, 'title')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="assignment-course">Course</FieldLabel>
                    <NativeSelect
                      id="assignment-course"
                      name="courseId"
                      defaultValue={course?.id ?? ''}
                    >
                      <option value="">None</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="assignment-subject">Subject</FieldLabel>
                    <NativeSelect
                      id="assignment-subject"
                      name="subjectId"
                      defaultValue={course?.subjectId ?? defaultSubjectId ?? ''}
                    >
                      <option value="">None</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
                    <FieldLabel htmlFor="assignment-segment">Life Segment</FieldLabel>
                    <SegmentSelect
                      id="assignment-segment"
                      segments={segments}
                      defaultValue={
                        course?.lifeSegmentId ?? segments.find((s) => s.slug === 'learning')?.id
                      }
                    />
                    <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
                  </Field>
                  <Field data-invalid={hasFieldError(state, 'dueDate')}>
                    <FieldLabel htmlFor="assignment-due">Due date</FieldLabel>
                    <Input id="assignment-due" name="dueDate" type="date" />
                    <FieldError errors={fieldErrors(state, 'dueDate')} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="assignment-notes">Notes</FieldLabel>
                  <Textarea id="assignment-notes" name="notes" rows={2} />
                </Field>
              </FieldGroup>
              <ErrorLine state={state} />
              <Footer label="Create assignment" />
            </form>
          );
        };
        return <Form />;
      }}
    </FormDialog>
  );
}

// ───────────────────────── note ─────────────────────────

export function StudyNoteFormDialog({
  subjects,
  courses,
  note,
  defaultCourseId,
  defaultSubjectId,
  lessonId,
  trigger,
  variant,
  size,
}: {
  subjects: SubjectOption[];
  courses: CourseOption[];
  note?: StudyNote;
  defaultCourseId?: string;
  defaultSubjectId?: string;
  lessonId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <FormDialog
      title={note ? 'Edit note' : 'New study note'}
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => {
        const Form = () => {
          const [state, formAction] = useForm(
            note ? updateStudyNoteAction : createStudyNoteAction,
            close
          );
          return (
            <form action={formAction} className="flex flex-col gap-4">
              {note && <input type="hidden" name="id" value={note.id} />}
              {(note?.lessonId ?? lessonId) && (
                <input type="hidden" name="lessonId" value={note?.lessonId ?? lessonId} />
              )}
              <FieldGroup>
                <Field data-invalid={hasFieldError(state, 'title')}>
                  <FieldLabel htmlFor="note-title">Title</FieldLabel>
                  <Input
                    id="note-title"
                    name="title"
                    defaultValue={note?.title}
                    required
                    maxLength={200}
                    autoFocus
                  />
                  <FieldError errors={fieldErrors(state, 'title')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="note-course">Course</FieldLabel>
                    <NativeSelect
                      id="note-course"
                      name="courseId"
                      defaultValue={note?.courseId ?? defaultCourseId ?? ''}
                    >
                      <option value="">None</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="note-subject">Subject</FieldLabel>
                    <NativeSelect
                      id="note-subject"
                      name="subjectId"
                      defaultValue={note?.subjectId ?? defaultSubjectId ?? ''}
                    >
                      <option value="">None</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="note-content">Content</FieldLabel>
                  <Textarea
                    id="note-content"
                    name="content"
                    rows={8}
                    defaultValue={note?.content ?? ''}
                  />
                </Field>
              </FieldGroup>
              <ErrorLine state={state} />
              <Footer label={note ? 'Save changes' : 'Save note'} />
            </form>
          );
        };
        return <Form />;
      }}
    </FormDialog>
  );
}

// ───────────────────────── resource ─────────────────────────

export function ResourceFormDialog({
  subjects,
  courses,
  defaultCourseId,
  defaultSubjectId,
  trigger,
  variant,
  size,
}: {
  subjects: SubjectOption[];
  courses: CourseOption[];
  defaultCourseId?: string;
  defaultSubjectId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <FormDialog
      title="New resource"
      description="A link, book, video or file worth keeping."
      trigger={trigger}
      variant={variant}
      size={size}
      className="sm:max-w-md"
    >
      {(close) => {
        const Form = () => {
          const [state, formAction] = useForm(createResourceAction, close);
          return (
            <form action={formAction} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={hasFieldError(state, 'title')}>
                  <FieldLabel htmlFor="resource-title">Title</FieldLabel>
                  <Input id="resource-title" name="title" required maxLength={200} autoFocus />
                  <FieldError errors={fieldErrors(state, 'title')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="resource-kind">Kind</FieldLabel>
                    <NativeSelect id="resource-kind" name="kind" defaultValue="link">
                      {RESOURCE_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {RESOURCE_KIND_LABELS[k]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field data-invalid={hasFieldError(state, 'url')}>
                    <FieldLabel htmlFor="resource-url">Link</FieldLabel>
                    <Input id="resource-url" name="url" type="url" placeholder="https://" />
                    <FieldError errors={fieldErrors(state, 'url')} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="resource-course">Course</FieldLabel>
                    <NativeSelect
                      id="resource-course"
                      name="courseId"
                      defaultValue={defaultCourseId ?? ''}
                    >
                      <option value="">None</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="resource-subject">Subject</FieldLabel>
                    <NativeSelect
                      id="resource-subject"
                      name="subjectId"
                      defaultValue={defaultSubjectId ?? ''}
                    >
                      <option value="">None</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="resource-note">Note</FieldLabel>
                  <Textarea id="resource-note" name="note" rows={2} />
                </Field>
              </FieldGroup>
              <ErrorLine state={state} />
              <Footer label="Add resource" />
            </form>
          );
        };
        return <Form />;
      }}
    </FormDialog>
  );
}

// ───────────────────────── manual session ─────────────────────────

export function LogSessionDialog({
  segments,
  subjects,
  courses,
  defaultCourseId,
  defaultSubjectId,
  nowLocal,
  trigger,
  variant,
  size,
}: {
  segments: SegmentRef[];
  subjects: SubjectOption[];
  courses: CourseOption[];
  defaultCourseId?: string;
  defaultSubjectId?: string;
  /** yyyy-MM-ddTHH:mm in the user's zone, for the default start. */
  nowLocal: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const course = courses.find((c) => c.id === defaultCourseId);
  return (
    <FormDialog
      title="Log a study session"
      description="Recorded as a time entry too, so planned versus actual time stays honest."
      trigger={trigger}
      variant={variant}
      size={size}
      className="sm:max-w-md"
    >
      {(close) => {
        const Form = () => {
          const [state, formAction] = useForm(logSessionAction, close);
          return (
            <form action={formAction} className="flex flex-col gap-4">
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="session-course">Course</FieldLabel>
                    <NativeSelect
                      id="session-course"
                      name="courseId"
                      defaultValue={course?.id ?? ''}
                    >
                      <option value="">None</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="session-subject">Subject</FieldLabel>
                    <NativeSelect
                      id="session-subject"
                      name="subjectId"
                      defaultValue={course?.subjectId ?? defaultSubjectId ?? ''}
                    >
                      <option value="">None</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
                    <FieldLabel htmlFor="session-segment">Life Segment</FieldLabel>
                    <SegmentSelect
                      id="session-segment"
                      segments={segments}
                      defaultValue={
                        course?.lifeSegmentId ?? segments.find((s) => s.slug === 'learning')?.id
                      }
                    />
                    <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="session-kind">Kind</FieldLabel>
                    <NativeSelect id="session-kind" name="kind" defaultValue="focus">
                      {SESSION_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {SESSION_KIND_LABELS[k]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={hasFieldError(state, 'startedAt')}>
                    <FieldLabel htmlFor="session-start">Started</FieldLabel>
                    <Input
                      id="session-start"
                      name="startedAt"
                      type="datetime-local"
                      defaultValue={nowLocal}
                      required
                    />
                    <FieldError errors={fieldErrors(state, 'startedAt')} />
                  </Field>
                  <Field data-invalid={hasFieldError(state, 'durationMinutes')}>
                    <FieldLabel htmlFor="session-minutes">Minutes</FieldLabel>
                    <Input
                      id="session-minutes"
                      name="durationMinutes"
                      type="number"
                      min={1}
                      max={720}
                      defaultValue={30}
                      required
                    />
                    <FieldError errors={fieldErrors(state, 'durationMinutes')} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="session-note">Note</FieldLabel>
                  <Textarea id="session-note" name="note" rows={2} />
                </Field>
              </FieldGroup>
              <ErrorLine state={state} />
              <Footer label="Log session" />
            </form>
          );
        };
        return <Form />;
      }}
    </FormDialog>
  );
}
