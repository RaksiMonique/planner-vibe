import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookMarkedIcon,
  BookOpenIcon,
  HeartIcon,
  PlusIcon,
  SparklesIcon,
  TargetIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { deletePlanAction, setPlanStatusAction } from '@/features/faith/actions';
import { DevotionalForm } from '@/features/faith/components/devotional-form';
import { PlanFormDialog } from '@/features/faith/components/plan-form-dialog';
import { ReadingToday } from '@/features/faith/components/reading-today';
import { ReferenceForm } from '@/features/faith/components/reference-form';
import { ReferenceRow } from '@/features/faith/components/reference-row';
import { StudyCard } from '@/features/faith/components/study-card';
import { StudyFormDialog } from '@/features/faith/components/study-form-dialog';
import { describeChapters, queuedBehind, queueTargets } from '@/features/faith/plans';
import {
  getActivePlanOverview,
  getDevotional,
  listPlans,
  listReferences,
  listStudies,
  listStudyOptions,
} from '@/features/faith/queries';
import { PLAN_STATUS_LABELS, STUDY_STATUS_LABELS } from '@/features/faith/schema';
import { STUDY_SHELF_ORDER, nextStudy } from '@/features/faith/studies';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Bible study' };
export const dynamic = 'force-dynamic';

export default async function BiblePage() {
  const user = await requireUser();
  const [segments, prefs] = await Promise.all([listSegments(user.id), getPreferences(user.id)]);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const faith = segments.find((s) => s.slug === 'faith') ?? segments[0];

  const [overview, devotional, studies, references, plans, studyOptions] = await Promise.all([
    getActivePlanOverview(user.id, todayKey),
    getDevotional(user.id, todayKey),
    listStudies(user.id),
    listReferences(user.id),
    listPlans(user.id),
    listStudyOptions(user.id),
  ]);
  const next = nextStudy(studies);
  const nextUp = next?.study;
  const inProgress = studies.filter((s) => s.status === 'in_progress');
  const favourites = references.filter((r) => r.isFavourite);
  const bookmarks = references.filter((r) => r.isBookmark && !r.isFavourite);
  const otherPlans = plans.filter((p) => p.id !== overview?.plan.id);
  const queueAfter = queueTargets(plans).map((p) => ({ id: p.id, name: p.name }));

  const newStudy = (
    <StudyFormDialog
      segments={segments}
      studies={studyOptions}
      inProgress={inProgress.map((s) => ({ id: s.id, title: s.title }))}
      continueId={next?.mode === 'continue' ? next.study.id : undefined}
      defaultSegmentId={faith?.id}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          New study
        </>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Bible study"
        description="Today's reading, a devotional, your studies and the verses you keep coming back to."
        actions={
          <>
            <PlanFormDialog
              segments={segments}
              defaultSegmentId={faith?.id}
              todayKey={todayKey}
              queueAfter={queueAfter}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  Reading plan
                </>
              }
            />
            {newStudy}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <BookOpenIcon className="text-primary size-4" aria-hidden />
              Today&apos;s reading
            </CardTitle>
            {overview && (
              <CardAction className="flex gap-1">
                <form action={setPlanStatusAction}>
                  <input type="hidden" name="id" value={overview.plan.id} />
                  <input type="hidden" name="status" value="paused" />
                  <Button type="submit" variant="ghost" size="xs">
                    Pause
                  </Button>
                </form>
                <form action={setPlanStatusAction}>
                  <input type="hidden" name="id" value={overview.plan.id} />
                  <input type="hidden" name="status" value="done" />
                  <Button type="submit" variant="ghost" size="xs">
                    Finish
                  </Button>
                </form>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-heading text-xl">{overview.plan.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {overview.plan.chaptersPerDay} a day ·{' '}
                    {overview.progress.behind > 0
                      ? `${overview.progress.behind} chapters behind`
                      : overview.progress.behind < 0
                        ? `${-overview.progress.behind} chapters ahead`
                        : 'on schedule'}{' '}
                    · about {overview.progress.remainingDays} days left
                  </p>
                </div>
                {overview.today.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Every chapter is read. Finish the plan above.
                  </p>
                ) : (
                  <ReadingToday
                    key={overview.today.map((c) => `${c.bookId}:${c.chapter}:${c.read}`).join('|')}
                    planId={overview.plan.id}
                    dateKey={todayKey}
                    chapters={overview.today}
                  />
                )}
                {overview.scheduled.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    The schedule has {describeChapters(overview.scheduled)} for today.
                  </p>
                )}
                <ProgressBar
                  value={overview.progress.percent}
                  label="Plan progress"
                  valueText={`${overview.progress.read} of ${overview.progress.total} chapters`}
                />
              </>
            ) : (
              <EmptyState
                icon={BookOpenIcon}
                title="No active reading plan"
                description="Pick the whole Bible, the New Testament, the Gospels, the Psalms or your own books, and how many chapters a day."
                action={
                  <PlanFormDialog
                    segments={segments}
                    defaultSegmentId={faith?.id}
                    todayKey={todayKey}
                    queueAfter={queueAfter}
                    variant="default"
                    trigger={
                      <>
                        <PlusIcon data-icon="inline-start" />
                        Start a reading plan
                      </>
                    }
                  />
                }
              />
            )}
            {otherPlans.length > 0 && (
              <ul className="text-muted-foreground flex flex-col gap-1 border-t pt-3 text-xs">
                {otherPlans.map((p) => {
                  const behind = queuedBehind(p, plans);
                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      <span className="min-w-0 truncate">{p.name}</span>
                      <Badge variant="outline" className="min-w-0 flex-1 justify-start truncate">
                        {behind ? `Queued after ${behind.name}` : PLAN_STATUS_LABELS[p.status]}
                      </Badge>
                      {p.status !== 'done' && !behind && (
                        <form action={setPlanStatusAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="active" />
                          <Button type="submit" variant="ghost" size="xs">
                            Resume
                          </Button>
                        </form>
                      )}
                      {p.status !== 'done' && (
                        <form action={setPlanStatusAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="done" />
                          <Button type="submit" variant="ghost" size="xs">
                            Finish
                          </Button>
                        </form>
                      )}
                      <ConfirmActionButton
                        action={deletePlanAction}
                        fields={{ id: p.id }}
                        title="Delete this reading plan?"
                        description="Its chapter history goes with it."
                        variant="ghost"
                        size="xs"
                        trigger="Delete"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <SparklesIcon className="text-primary size-4" aria-hidden />
              Today&apos;s devotional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DevotionalForm
              dateKey={todayKey}
              segments={segments}
              defaultSegmentId={faith?.id}
              entry={devotional}
              compact
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-7">
          {nextUp && (
            <Card className="bg-secondary ring-0">
              <CardContent className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
                    {next?.mode === 'continue' ? 'Continue' : 'Next up'}
                  </p>
                  <Link
                    href={`/bible/${nextUp.id}`}
                    className="font-heading text-lg hover:underline"
                  >
                    {nextUp.title}
                  </Link>
                </div>
                <Link href={`/bible/${nextUp.id}`} className={cn(buttonVariants({ size: 'sm' }))}>
                  {next?.mode === 'continue' ? 'Continue' : 'Open'}
                </Link>
              </CardContent>
            </Card>
          )}
          {studies.length === 0 ? (
            <EmptyState
              icon={BookMarkedIcon}
              title="No studies yet"
              description="Add a Bible study, a devotional series, a spiritual book or a course, then keep notes and passages inside it."
              action={newStudy}
            />
          ) : (
            STUDY_SHELF_ORDER.map((status) => {
              const group = studies.filter((s) => s.status === status);
              if (group.length === 0) return null;
              return (
                <section key={status} className="flex flex-col gap-2">
                  <h3 className="font-heading text-lg">
                    {STUDY_STATUS_LABELS[status]}{' '}
                    <span className="text-muted-foreground text-sm">({group.length})</span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.map((s) => (
                      <StudyCard
                        key={s.id}
                        study={s}
                        highlight={
                          s.id === nextUp?.id
                            ? next?.mode === 'continue'
                              ? 'Continue'
                              : 'Next up'
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2 text-lg">
                <HeartIcon className="text-primary size-4" aria-hidden />
                Verses to keep
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ReferenceForm />
              {favourites.length === 0 && bookmarks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No saved passages yet.</p>
              ) : (
                <>
                  {favourites.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
                        Favourites
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {favourites.map((r) => (
                          <ReferenceRow key={r.id} reference={r} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {bookmarks.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
                        Bookmarks
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {bookmarks.map((r) => (
                          <ReferenceRow key={r.id} reference={r} />
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-2 text-sm">
              <Link
                href="/media/reading?segment=faith"
                className="flex items-center gap-2 hover:underline"
              >
                <BookMarkedIcon className="text-primary size-4" aria-hidden />
                Spiritual reading list
              </Link>
              <Link href="/goals?segment=faith" className="flex items-center gap-2 hover:underline">
                <TargetIcon className="text-primary size-4" aria-hidden />
                Spiritual goals
              </Link>
              <Link href="/prayer" className="flex items-center gap-2 hover:underline">
                <HeartIcon className="text-primary size-4" aria-hidden />
                Prayer intentions and journal
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
