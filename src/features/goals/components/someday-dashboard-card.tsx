import Link from 'next/link';
import { parseISO } from 'date-fns';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { toDateKey, weekRange, type WeekStartsOn } from '@/lib/dates';
import { startSomedayAction } from '../actions';
import { listSomedayCandidates } from '../queries';
import { pickSomeday } from '../someday';

/**
 * One goal or project from the someday pile a week (someday.ts), with a plain
 * question and a button to start it. A dream list with no deadlines lets the
 * mind work on it in the background; this is where it gets asked about.
 */
export async function SomedayDashboardCard({
  userId,
  todayKey,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const items = await listSomedayCandidates(userId);
  const weekKey = toDateKey(weekRange(parseISO(todayKey), weekStartsOn).start);
  const pick = pickSomeday(items, weekKey);
  const more = items.length - 1;

  return (
    <DashboardCard title="Someday" icon={SparklesIcon} href="/goals?status=all" release={6}>
      {!pick ? (
        <EmptyNote>
          Nothing on the someday pile. A goal or project with no date turns up here.
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-3" data-slot="someday-pick">
          <div className="flex items-center gap-2">
            <SegmentDot accent={pick.segment.accent} />
            <Link
              href={pick.kind === 'goal' ? `/goals/${pick.id}` : `/projects/${pick.id}`}
              className="font-heading link min-w-0 flex-1 truncate text-lg leading-snug"
              title={pick.title}
            >
              {pick.title}
            </Link>
          </div>
          <p className="text-muted-foreground text-sm">You said someday. Still want it?</p>
          <form action={startSomedayAction} className="flex items-center gap-3">
            <input type="hidden" name="kind" value={pick.kind} />
            <input type="hidden" name="id" value={pick.id} />
            <Button type="submit" size="sm" variant="outline">
              Start it
            </Button>
            {more > 0 && <span className="text-muted-foreground text-xs">{more} more waiting</span>}
          </form>
        </div>
      )}
    </DashboardCard>
  );
}
