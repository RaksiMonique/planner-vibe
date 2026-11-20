import Link from 'next/link';
import { ShieldAlertIcon, ShieldIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import type { WeekStartsOn } from '@/lib/dates';
import { IMPORTANT_KIND_META } from '../kinds';
import { countRecords, listRecentRecords } from '../queries';

const PREVIEW = 5;

/**
 * The most recently edited records by title and kind only. Field values such
 * as phone numbers and policy references stay on the Important page.
 */
export async function ImportantDashboardCard({
  userId,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const [shown, total] = await Promise.all([
    listRecentRecords(userId, PREVIEW),
    countRecords(userId),
  ]);
  const more = total - shown.length;

  return (
    <DashboardCard
      title="Important information"
      icon={ShieldAlertIcon}
      href="/important"
      release={6}
    >
      {shown.length === 0 ? (
        <EmptyNote>
          Nothing stored yet.{' '}
          <Link href="/important" className="text-primary link">
            Add an emergency contact.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {shown.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <Link href={`/important?kind=${r.kind}`} className="link min-w-0 flex-1 truncate">
                  {r.title}
                </Link>
                {r.isSensitive && (
                  <ShieldIcon
                    className="text-muted-foreground size-3 shrink-0"
                    aria-label="Sensitive"
                  />
                )}
                <span className="text-muted-foreground shrink-0 text-xs">
                  {IMPORTANT_KIND_META[r.kind].label}
                </span>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <Link href="/important" className="text-primary link text-xs">
              {more} more on the Important page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
