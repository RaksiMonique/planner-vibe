import Link from 'next/link';
import { ClapperboardIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listMediaItems, listMediaLogs } from '../queries';
import { MEDIA_KIND_LABELS } from '../schema';

const PREVIEW = 4;
const UP_NEXT = 2;

/** Films, series and the rest in progress (books have the Reading card), then two from the wishlist. */
export async function MediaDashboardCard({ userId }: { userId: string }) {
  const [inProgress, wishlist] = await Promise.all([
    listMediaItems(userId, { status: 'in_progress' }),
    listMediaItems(userId, { status: 'wishlist' }),
  ]);
  const going = inProgress.filter((i) => i.kind !== 'book');
  const shown = going.slice(0, PREVIEW);
  const more = going.length - shown.length;
  const upNext = wishlist.filter((i) => i.kind !== 'book').slice(0, UP_NEXT);
  const latest = await Promise.all(
    shown.map(async (item) => (await listMediaLogs(userId, item.id))[0]?.progress ?? null)
  );

  return (
    <DashboardCard title="Media" icon={ClapperboardIcon} href="/media" release={6}>
      {going.length === 0 && upNext.length === 0 ? (
        <EmptyNote>
          Nothing on the go.{' '}
          <Link href="/media" className="text-primary link">
            Add something to watch or listen to.
          </Link>
        </EmptyNote>
      ) : (
        <>
          {going.length === 0 ? (
            <EmptyNote>Nothing on the go.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {shown.map((item, i) => (
                <li key={item.id} className="flex items-baseline gap-2 text-sm">
                  <span className="text-muted-foreground w-12 shrink-0 text-xs">
                    {MEDIA_KIND_LABELS[item.kind]}
                  </span>
                  <Link href={`/media/${item.id}`} className="link min-w-0 flex-1 truncate">
                    {item.title}
                  </Link>
                  {latest[i] && (
                    <span className="text-muted-foreground max-w-[40%] truncate text-xs">
                      {latest[i]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {more > 0 && (
            <Link href="/media" className="text-primary link text-xs">
              {more} more on the Media page
            </Link>
          )}
          {upNext.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs">Up next</p>
              <ul className="flex flex-col gap-1">
                {upNext.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-2 text-sm">
                    <span className="text-muted-foreground w-12 shrink-0 text-xs">
                      {MEDIA_KIND_LABELS[item.kind]}
                    </span>
                    <Link href={`/media/${item.id}`} className="link min-w-0 flex-1 truncate">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
}
