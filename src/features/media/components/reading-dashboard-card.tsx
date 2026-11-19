import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { BookMarkedIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { progressPercent } from '../progress';
import { listMediaItems, listMediaLogs } from '../queries';

const READING = 2;
const QUEUE = 2;

/** The books on the go with their latest logged position, then the first of the queue. */
export async function ReadingDashboardCard({ userId }: { userId: string }) {
  const books = await listMediaItems(userId, { kind: 'book' });
  const reading = books.filter((b) => b.status === 'in_progress').slice(0, READING);
  const queued = books.filter((b) => b.status === 'wishlist');
  const nextUp = queued.slice(0, QUEUE);
  const latestLogs = await Promise.all(
    reading.map(async (b) => (await listMediaLogs(userId, b.id))[0] ?? null)
  );

  return (
    <DashboardCard title="Reading" icon={BookMarkedIcon} href="/media/reading" release={6}>
      {reading.length === 0 && nextUp.length === 0 ? (
        <EmptyNote>
          Nothing on the go.{' '}
          <Link href="/media/reading" className="text-primary link">
            Add a book.
          </Link>
        </EmptyNote>
      ) : (
        <>
          {reading.length === 0 ? (
            <EmptyNote>Nothing on the go right now.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3">
              {reading.map((b, i) => {
                const log = latestLogs[i];
                const percent = progressPercent(log?.progress);
                return (
                  <li key={b.id} className="flex flex-col gap-1">
                    <p className="text-sm">
                      <Link href={`/media/${b.id}`} className="link font-medium">
                        {b.title}
                      </Link>
                      {b.creator && <span className="text-muted-foreground"> · {b.creator}</span>}
                    </p>
                    {percent !== null ? (
                      <ProgressBar
                        value={percent}
                        valueText={log?.progress ?? `${percent}%`}
                        className="gap-0.5"
                      />
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        {log
                          ? `${log.progress ? `At ${log.progress}, ` : 'Last read '}${format(parseISO(log.date), 'd MMM')}`
                          : b.startedOn
                            ? `Started ${format(parseISO(b.startedOn), 'd MMM')}`
                            : 'No pages logged yet'}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {nextUp.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs">Next up</p>
              <ul className="flex flex-col gap-1">
                {nextUp.map((b) => (
                  <li key={b.id} className="truncate text-sm">
                    {b.title}
                    {b.creator && <span className="text-muted-foreground"> · {b.creator}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {queued.length > nextUp.length && (
            <Link href="/media/reading" className="text-primary link text-xs">
              {queued.length - nextUp.length} more on the Reading list
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
