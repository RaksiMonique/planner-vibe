import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon, TargetIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { GoalCard } from '@/features/goals/components/goal-card';
import { GoalFormDialog } from '@/features/goals/components/goal-form-dialog';
import { groupGoalsByHorizon } from '@/features/goals/grouping';
import { listGoalOptions, listGoals } from '@/features/goals/queries';
import { HORIZON_LABELS } from '@/features/goals/schema';
import { SegmentFilter } from '@/features/life-segments/components/segment-filter';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Goals' };
export const dynamic = 'force-dynamic';

export default async function GoalsPage({ searchParams }: PageProps<'/goals'>) {
  const user = await requireUser();
  const params = await searchParams;
  const segmentSlug = typeof params.segment === 'string' ? params.segment : undefined;
  const showAll = params.status === 'all';

  const [segments, goalOptions, projectOptions, prefs] = await Promise.all([
    listSegments(user.id),
    listGoalOptions(user.id),
    listProjectOptions(user.id),
    getPreferences(user.id),
  ]);
  const segment = segments.find((s) => s.slug === segmentSlug);
  const goals = await listGoals(user.id, {
    lifeSegmentId: segment?.id,
    status: showAll ? 'all' : 'active',
  });
  const groups = groupGoalsByHorizon(goals);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const toggleHref = (() => {
    const p = new URLSearchParams();
    if (segment) p.set('segment', segment.slug);
    if (!showAll) p.set('status', 'all');
    const qs = p.toString();
    return qs ? `/goals?${qs}` : '/goals';
  })();

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Life Segments', href: '/segments' }]}
        title="Goals"
        description="Lifelong aspirations broken into annual, quarterly, monthly and weekly outcomes."
        actions={
          <>
            <Link
              href={toggleHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {showAll ? 'Active only' : 'Include finished'}
            </Link>
            <GoalFormDialog
              segments={segments}
              goalOptions={goalOptions}
              projectOptions={projectOptions}
              defaults={{ lifeSegmentId: segment?.id }}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New goal
                </>
              }
            />
          </>
        }
      />
      <SegmentFilter
        basePath="/goals"
        segments={segments}
        current={segment?.slug}
        extra={{ status: showAll ? 'all' : undefined }}
      />
      {groups.length === 0 ? (
        <EmptyState
          icon={TargetIcon}
          title="No goals here yet"
          description="Start with a lifelong aspiration, then add the annual goal that moves it."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.horizon} className="flex flex-col gap-3">
              <h3 className="font-heading text-xl">
                {HORIZON_LABELS[group.horizon]}{' '}
                <span className="text-muted-foreground text-sm">({group.goals.length})</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.goals.map((g) => (
                  <GoalCard key={g.id} goal={g} todayKey={todayKey} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
