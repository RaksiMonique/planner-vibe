import Link from 'next/link';
import { formatInTimeZone } from 'date-fns-tz';
import { FileTextIcon, PinIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import type { WeekStartsOn } from '@/lib/dates';
import { countNotes, listRecentNotes } from '../queries';
import { noteHeading, relativeDayLabel } from '../recency';

const PREVIEW = 5;

/** Pinned notes first, then the most recently edited; quotes have their own card. */
export async function NotesDashboardCard({
  userId,
  todayKey,
  timeZone,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const [shown, total] = await Promise.all([
    listRecentNotes(userId, 'note', PREVIEW),
    countNotes(userId, 'note'),
  ]);
  const more = total - shown.length;

  return (
    <DashboardCard title="Notes" icon={FileTextIcon} href="/notes" release={6}>
      {shown.length === 0 ? (
        <EmptyNote>
          No notes yet.{' '}
          <Link href="/notes" className="text-primary link">
            Write the first one.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {shown.map((n) => (
              <li key={n.id} className="flex items-center gap-2 text-sm">
                <SegmentDot accent={n.segment.accent} />
                <Link
                  href={`/notes?segment=${n.segment.slug}`}
                  className="link min-w-0 flex-1 truncate"
                  title={n.segment.name}
                >
                  {noteHeading(n)}
                </Link>
                {n.isPinned && (
                  <PinIcon className="text-primary size-3 shrink-0" aria-label="Pinned" />
                )}
                <span className="text-muted-foreground shrink-0 text-xs">
                  edited{' '}
                  {relativeDayLabel(
                    formatInTimeZone(n.updatedAt, timeZone, 'yyyy-MM-dd'),
                    todayKey
                  )}
                </span>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <Link href="/notes" className="text-primary link text-xs">
              {more} more on the Notes page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
