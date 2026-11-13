import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpIcon, ChevronRightIcon, TargetIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { buildAncestorChain } from '@/features/goals/grouping';
import { getGoal, listGoalOptions, listGoals } from '@/features/goals/queries';
import { MandalaGrid } from '@/features/horizons/components/mandala-grid';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mandala view' };
export const dynamic = 'force-dynamic';

const CLOSED = new Set(['achieved', 'abandoned']);

export default async function MandalaPage({ params }: PageProps<'/goals/[id]/mandala'>) {
  const user = await requireUser();
  const { id } = await params;
  const goal = await getGoal(user.id, id);
  if (!goal) notFound();
  const [allGoals, segments, goalOptions, projectOptions] = await Promise.all([
    listGoals(user.id, { status: 'all' }),
    listSegments(user.id),
    listGoalOptions(user.id),
    listProjectOptions(user.id),
  ]);
  const ancestors = buildAncestorChain(id, allGoals);
  const parent = ancestors.at(-1) ?? null;
  const children = allGoals
    .filter((g) => g.parentGoalId === id && !CLOSED.has(g.status))
    .sort(
      (a, b) =>
        (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999') ||
        a.title.localeCompare(b.title)
    );

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-2 flex flex-wrap items-center gap-1 text-xs"
      >
        <Link href="/goals" className="hover:underline">
          Goals
        </Link>
        {ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <ChevronRightIcon className="size-3" aria-hidden />
            <Link href={`/goals/${a.id}/mandala`} className="hover:underline">
              {a.title}
            </Link>
          </span>
        ))}
      </nav>
      <PageHeader
        crumbs={[
          { label: 'Goals', href: '/goals' },
          { label: goal.title, href: `/goals/${goal.id}` },
        ]}
        eyebrow="Mandala view"
        title={goal.title}
        description="The goal in the middle, the goals that serve it around it. Open any cell to see its own grid."
        actions={
          <>
            {parent && (
              <Link
                href={`/goals/${parent.id}/mandala`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                <ArrowUpIcon data-icon="inline-start" />
                Up to {parent.title}
              </Link>
            )}
            <Link
              href={`/goals/${goal.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <TargetIcon data-icon="inline-start" />
              Open goal
            </Link>
          </>
        }
      />
      <MandalaGrid
        center={goal}
        supporting={children}
        segments={segments}
        goalOptions={goalOptions}
        projectOptions={projectOptions}
      />
    </>
  );
}
