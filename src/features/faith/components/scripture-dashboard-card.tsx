import Link from 'next/link';
import { BookMarkedIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listReferences } from '../queries';
import { pickScriptureOfDay } from '../scripture-of-day';

/**
 * One saved passage for the day, picked from favourites (or bookmarks) by day
 * of year. Only the reference and the user's note are stored, never the text.
 */
export async function ScriptureDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const references = await listReferences(userId);
  const passage = pickScriptureOfDay(references, todayKey);
  const saved = references.filter((r) => r.isFavourite || r.isBookmark).length;

  return (
    <DashboardCard title="Scripture of the day" icon={BookMarkedIcon} href="/bible" release={6}>
      {!passage ? (
        <EmptyNote>
          No favourites or bookmarks yet.{' '}
          <Link href="/bible" className="text-primary link">
            Save a verse to keep.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="font-heading text-2xl leading-snug">{passage.label}</p>
          {passage.note ? (
            <p className="text-muted-foreground line-clamp-4 text-sm whitespace-pre-line">
              {passage.note}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {passage.isFavourite ? 'One of your favourites.' : 'One of your bookmarks.'}
            </p>
          )}
          <p className="flex flex-wrap items-center gap-x-3 text-xs">
            <Link href="/bible" className="text-primary link">
              Read it
            </Link>
            {saved > 1 && (
              <span className="text-muted-foreground">
                {saved} saved passages take turns, one a day.
              </span>
            )}
          </p>
        </>
      )}
    </DashboardCard>
  );
}
