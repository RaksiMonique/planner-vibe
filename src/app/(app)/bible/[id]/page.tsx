import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeftIcon, CheckIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentBadge } from '@/components/shared/segment-badge';
import {
  deleteStudyAction,
  deleteStudyNoteAction,
  touchStudyAction,
} from '@/features/faith/actions';
import { StudyFormDialog } from '@/features/faith/components/study-form-dialog';
import { StudyNoteForm } from '@/features/faith/components/study-note-form';
import { StudyStatusControls } from '@/features/faith/components/study-status-controls';
import { getStudy, listStudyOptions } from '@/features/faith/queries';
import { PRIORITY_LABELS, STUDY_KIND_LABELS, STUDY_STATUS_LABELS } from '@/features/faith/schema';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listSegments } from '@/features/life-segments/service';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Study' };
export const dynamic = 'force-dynamic';

export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [study, segments, options] = await Promise.all([
    getStudy(user.id, id),
    listSegments(user.id),
    listStudyOptions(user.id),
  ]);
  if (!study) notFound();

  return (
    <>
      <Link
        href="/bible"
        className="text-muted-foreground mb-3 inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Bible study
      </Link>
      <PageHeader
        eyebrow={STUDY_KIND_LABELS[study.kind]}
        title={study.title}
        description={study.description ?? undefined}
        actions={
          <>
            <form action={touchStudyAction}>
              <input type="hidden" name="id" value={study.id} />
              <Button type="submit" variant="outline" size="sm">
                <CheckIcon data-icon="inline-start" />
                Studied today
              </Button>
            </form>
            <StudyFormDialog
              segments={segments}
              studies={options}
              study={study}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <ConfirmActionButton
              action={deleteStudyAction}
              fields={{ id: study.id }}
              title="Delete this study?"
              description="Its notes go with it. Saved passages stay in your verses."
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

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <SegmentBadge name={study.segment.name} accent={study.segment.accent} />
              <Badge variant="outline">{PRIORITY_LABELS[study.priority]} priority</Badge>
              {study.translation && <Badge variant="outline">{study.translation}</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24">Status</span>
              <StudyStatusControls id={study.id} status={study.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24">Last studied</span>
              <span>
                {study.lastStudiedAt ? format(study.lastStudiedAt, 'd MMM yyyy') : 'Not yet'}
              </span>
            </div>
            {study.prerequisite && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24">Comes after</span>
                <Link href={`/bible/${study.prerequisite.id}`} className="hover:underline">
                  {study.prerequisite.title}
                </Link>
                <Badge variant="outline">{STUDY_STATUS_LABELS[study.prerequisite.status]}</Badge>
              </div>
            )}
            {study.dependants.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Unlocks</span>
                <ul className="flex flex-col gap-1">
                  {study.dependants.map((d) => (
                    <li key={d.id}>
                      <Link href={`/bible/${d.id}`} className="hover:underline">
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-1 border-t pt-3">
              <span className="text-muted-foreground">Passages in this study</span>
              {study.notes.filter((n) => n.reference).length === 0 ? (
                <span className="text-muted-foreground text-xs">
                  None yet; add one with a note.
                </span>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {study.notes
                    .filter((n) => n.reference)
                    .map((n) => (
                      <Badge key={n.id} variant="secondary">
                        {n.reference!.label}
                      </Badge>
                    ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <StudyNoteForm studyId={study.id} />
            {study.notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notes yet.</p>
            ) : (
              <ol className="flex flex-col gap-3 border-t pt-4">
                {study.notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs">
                        {format(n.createdAt, 'd MMM yyyy, HH:mm')}
                        {n.reference && (
                          <>
                            {' '}
                            ·{' '}
                            <span className="text-foreground font-medium">{n.reference.label}</span>
                          </>
                        )}
                      </p>
                      <p className="text-sm whitespace-pre-line">{n.content}</p>
                    </div>
                    <form action={deleteStudyNoteAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <Button type="submit" variant="ghost" size="icon-xs" aria-label="Delete note">
                        <Trash2Icon />
                      </Button>
                    </form>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6">
        <Link href="/bible" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeftIcon data-icon="inline-start" />
          All studies
        </Link>
      </p>
    </>
  );
}
