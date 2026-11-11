import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { PrintButton } from '@/components/shared/print-button';
import { WeekView } from '@/features/week/components/week-view';
import { getWeekData } from '@/features/week/queries';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'This week' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WeekPage({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getWeekData(
    user.id,
    typeof params.date === 'string' ? params.date : undefined
  );
  return (
    <>
      <PageHeader
        title="This week"
        description="Everything the week holds: events, time blocks, what is due, routines and habits, day by day."
        actions={<PrintButton />}
      />
      <WeekView data={data} />
    </>
  );
}
