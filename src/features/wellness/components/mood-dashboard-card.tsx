import { SmileIcon } from 'lucide-react';
import { DashboardCard } from '@/features/dashboard/components/dashboard-card';
import { getMoodForDate, listMoodBetween } from '../queries';
import { ENERGY_WORDS, MOOD_WORDS } from '../schema';
import { lastDays } from '../stats';
import { MoodQuickPick } from './mood-quick-pick';
import { MoodTrend } from './mood-trend';

/** Today's mood and energy check-in, or the values once saved, with the last seven days. */
export async function MoodDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const days = lastDays(todayKey, 7);
  const [entry, recent] = await Promise.all([
    getMoodForDate(userId, todayKey),
    listMoodBetween(userId, days[0], todayKey),
  ]);
  const byDate = new Map(recent.map((e) => [e.date, e]));
  const trend = days.map((date) => ({
    date,
    mood: byDate.get(date)?.mood ?? null,
    energy: byDate.get(date)?.energy ?? null,
  }));

  return (
    <DashboardCard title="Mood and energy" icon={SmileIcon} href="/wellness/mood" release={4}>
      {entry ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            Mood <span className="font-medium">{entry.mood}</span> · {MOOD_WORDS[entry.mood]},
            energy <span className="font-medium">{entry.energy}</span> ·{' '}
            {ENERGY_WORDS[entry.energy]}
          </p>
          {entry.note && <p className="text-muted-foreground line-clamp-2 text-xs">{entry.note}</p>}
        </div>
      ) : (
        <MoodQuickPick dateKey={todayKey} />
      )}
      <MoodTrend days={trend} compact />
    </DashboardCard>
  );
}
