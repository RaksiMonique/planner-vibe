import Link from 'next/link';
import { GiftIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { inDays, summariseGiftStatus, upcomingOccasions } from '../occasions';
import { listGifts, listRecipients } from '../queries';

const PREVIEW = 5;
const WINDOW_DAYS = 60;

/** Birthdays and gift occasions in the next two months, with how ready the gifts are. */
export async function GiftsDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const [recipients, gifts] = await Promise.all([listRecipients(userId), listGifts(userId)]);
  const upcoming = upcomingOccasions(recipients, gifts, todayKey, WINDOW_DAYS);
  const shown = upcoming.slice(0, PREVIEW);
  const more = upcoming.length - shown.length;

  return (
    <DashboardCard title="Gifts" icon={GiftIcon} href="/gifts" release={6}>
      {upcoming.length === 0 ? (
        <EmptyNote>
          Nothing coming up in the next two months.{' '}
          <Link href="/gifts" className="text-primary link">
            Add a birthday or an occasion.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {shown.map((o) => (
              <li key={o.key} className="flex items-baseline gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{o.person}</span>
                  <span className="text-muted-foreground"> · {o.occasion}</span>
                </span>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {summariseGiftStatus(o.gifts)}
                </span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums">
                  {inDays(o.days)}
                </span>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <Link href="/gifts" className="text-primary link text-xs">
              {more} more on the Gifts page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
