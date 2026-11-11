import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { PeriodNav } from '@/features/horizons/components/period-nav';
import { QuarterView } from '@/features/horizons/components/quarter-view';
import { getQuarterData } from '@/features/horizons/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Quarter' };
export const dynamic = 'force-dynamic';

export default async function QuarterPage({ searchParams }: PageProps<'/quarter'>) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getQuarterData(
    user.id,
    typeof params.quarter === 'string' ? params.quarter : undefined
  );
  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title={`Quarter · ${data.range.label}`}
        description="Objectives, milestones, deadlines and progress for the quarter, with its retrospective."
        actions={
          <PeriodNav
            label="Quarter"
            prevHref={`/quarter?quarter=${data.prevKey}`}
            nextHref={`/quarter?quarter=${data.nextKey}`}
            currentHref="/quarter"
            currentLabel="This quarter"
            isCurrent={data.range.key === data.currentKey}
          />
        }
      />
      <QuarterView data={data} />
    </>
  );
}
