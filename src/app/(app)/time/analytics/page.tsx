import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { resolveRange } from '@/features/time/analytics';
import { AnalyticsRangeNav, AnalyticsView } from '@/features/time/components/analytics-view';
import { buildTimeAnalytics } from '@/features/time/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Time analytics' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TimeAnalyticsRoute({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const prefs = await getPreferences(user.id);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const range = resolveRange(
    { range: params.range, start: params.start },
    todayKey,
    prefs.timeZone,
    prefs.weekStartsOn
  );
  const [segments, data] = await Promise.all([
    listSegments(user.id, { includeArchived: true }),
    buildTimeAnalytics(user.id, range, prefs.timeZone),
  ]);

  return (
    <>
      <PageHeader
        title="Time analytics"
        description="Planned blocks against logged time: by day, Life Segment, project and task."
      />
      <div className="flex flex-col gap-6">
        <AnalyticsRangeNav range={range} />
        <AnalyticsView
          range={range}
          data={data}
          labels={{
            segments: Object.fromEntries(
              segments.map((s) => [s.id, { name: s.name, accent: s.accent }])
            ),
          }}
        />
      </div>
    </>
  );
}
