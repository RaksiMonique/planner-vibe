import Link from 'next/link';
import { GoalProgress } from '@/features/goals/components/goal-progress';
import type { ReviewStats } from '../service';

const HORIZON: Record<string, string> = {
  lifelong: 'Lifelong',
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  weekly: 'Weekly',
};

/** The numbers behind the period, shown above the prompts. */
export function ReviewStatsBlock({ stats }: { stats: ReviewStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat label="Tasks done" value={String(stats.tasksDone)} />
      <Stat label="Still open" value={String(stats.tasksOpen)} />
      <Stat
        label="Daily habit consistency"
        value={stats.habitRate === null ? 'No daily habits' : `${stats.habitRate}%`}
      />
      {stats.goals.length > 0 && (
        <div className="sm:col-span-3">
          <p className="tracking-eyebrow text-muted-foreground mb-2 text-[11px] uppercase">
            Goals in this period
          </p>
          <ul className="flex flex-col gap-2">
            {stats.goals.map((g) => (
              <li key={g.id} className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm">
                  <Link href={`/goals/${g.id}`} className="hover:underline">
                    {g.title}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {HORIZON[g.horizon] ?? g.horizon}
                  </span>
                </span>
                <GoalProgress progress={g.progress} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card flex flex-col gap-0.5 rounded-lg border px-3 py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-heading text-xl">{value}</span>
    </div>
  );
}
