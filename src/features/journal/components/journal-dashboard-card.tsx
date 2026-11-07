import Link from 'next/link';
import { NotebookPenIcon } from 'lucide-react';
import { DashboardCard } from '@/features/dashboard/components/dashboard-card';
import { getDayEntries } from '../queries';
import { excerpt, gratitudeLines, MOOD_LABELS } from '../schema';
import { QuickGratitude } from './quick-gratitude';

/** Today's journal excerpt (or a prompt to write) and a one-line gratitude add. */
export async function JournalDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const day = await getDayEntries(userId, todayKey);
  const lines = gratitudeLines(day.gratitude?.content);
  return (
    <DashboardCard title="Journal" icon={NotebookPenIcon} href="/journal" release={3}>
      {day.daily ? (
        <Link href={`/journal?date=${todayKey}`} className="flex flex-col gap-1">
          {day.daily.title && <span className="text-sm font-medium">{day.daily.title}</span>}
          <span className="text-sm">{excerpt(day.daily.content, 180)}</span>
          {day.daily.mood && (
            <span className="text-muted-foreground text-xs">
              Mood: {MOOD_LABELS[day.daily.mood]}
            </span>
          )}
        </Link>
      ) : (
        <Link
          href={`/journal?date=${todayKey}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Nothing written today yet. What stood out?
        </Link>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="tracking-eyebrow text-muted-foreground text-[11px] uppercase">Grateful for</p>
        {lines.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-sm">
            {lines.slice(0, 3).map((l, i) => (
              <li key={i}>· {l}</li>
            ))}
          </ul>
        )}
        <QuickGratitude dateKey={todayKey} />
      </div>
    </DashboardCard>
  );
}
