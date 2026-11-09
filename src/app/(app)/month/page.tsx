import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { MonthView } from '@/features/month/components/month-view';
import { getMonthData } from '@/features/month/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Monthly overview' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MonthPage({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getMonthData(
    user.id,
    typeof params.month === 'string' ? params.month : undefined
  );
  return (
    <>
      <PageHeader
        title="Monthly overview"
        description="The month at a glance: what is scheduled and due each day, goals and milestones for the month, and how the habits are going."
      />
      <MonthView data={data} />
    </>
  );
}
