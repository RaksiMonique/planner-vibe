import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { PeriodNav } from '@/features/horizons/components/period-nav';
import { YearView } from '@/features/horizons/components/year-view';
import { getYearData } from '@/features/horizons/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Year' };
export const dynamic = 'force-dynamic';

export default async function YearPage({ searchParams }: PageProps<'/year'>) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getYearData(
    user.id,
    typeof params.year === 'string' ? params.year : undefined
  );
  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title={`Year · ${data.range.key}`}
        description="Annual objectives, the year at a glance, the quarterly breakdown and the yearly reflection."
        actions={
          <PeriodNav
            label="Year"
            prevHref={`/year?year=${data.prevKey}`}
            nextHref={`/year?year=${data.nextKey}`}
            currentHref="/year"
            currentLabel="This year"
            isCurrent={data.range.key === data.currentKey}
          />
        }
      />
      <YearView data={data} />
    </>
  );
}
