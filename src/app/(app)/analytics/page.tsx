import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { AnalyticsView } from '@/features/analytics/components/analytics-view';
import { AnalyticsPeriodNav } from '@/features/analytics/components/period-nav';
import { getAnalyticsData } from '@/features/analytics/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Analytics' };
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: PageProps<'/analytics'>) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getAnalyticsData(user.id, { period: params.period, start: params.start });
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Goal completion, habit consistency, time allocation, projects, mood and life balance for a month, quarter or year."
      />
      <div className="flex flex-col gap-6">
        <AnalyticsPeriodNav period={data.period} todayKey={data.todayKey} />
        <AnalyticsView data={data} />
      </div>
    </>
  );
}
