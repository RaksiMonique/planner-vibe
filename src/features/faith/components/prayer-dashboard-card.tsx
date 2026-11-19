import Link from 'next/link';
import { HandHeartIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { prayerSpan } from '../prayer-span';
import { listPrayers } from '../queries';

const PREVIEW = 5;

/** Open prayer intentions with how long each has been prayed for, and the answered count. */
export async function PrayerDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const intentions = await listPrayers(userId, { kind: 'intention' });
  const open = intentions.filter((e) => !e.answeredAt);
  const answered = intentions.length - open.length;
  const shown = open.slice(0, PREVIEW);
  const more = open.length - shown.length;

  return (
    <DashboardCard title="Prayer" icon={HandHeartIcon} href="/prayer" release={6}>
      {open.length === 0 ? (
        <EmptyNote>
          {answered > 0
            ? `No open intentions. ${answered} answered so far. `
            : 'No intentions yet. '}
          <Link href="/prayer" className="text-primary link">
            Add someone to pray for.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {open.length} open {open.length === 1 ? 'intention' : 'intentions'}
            {answered > 0 && `, ${answered} answered`}.
          </p>
          <ul className="flex flex-col gap-1.5">
            {shown.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <SegmentDot accent={e.segment.accent} />
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {prayerSpan(e.date, todayKey)}
                </span>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <Link href="/prayer" className="text-primary link text-xs">
              {more} more on the Prayer page
            </Link>
          )}
        </>
      )}
      <Link href="/prayer" className="text-primary link text-xs">
        Write in the prayer journal
      </Link>
    </DashboardCard>
  );
}
