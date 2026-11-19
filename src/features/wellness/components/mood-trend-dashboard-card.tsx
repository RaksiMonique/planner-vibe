import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { TrendingUpIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listMoodBetween } from '../queries';
import { averages, lastDays } from '../stats';
import { lineGeometry, moodSummary, type Series } from '../trend';

const WIDTH = 140;
const HEIGHT = 48;
const PAD = 4;
const BOX = { width: WIDTH, height: HEIGHT, pad: PAD };

/** The last seven days of mood and energy as two lines, with the week's average against the week before. */
export async function MoodTrendDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const fortnight = lastDays(todayKey, 14);
  const days = fortnight.slice(7);
  const entries = await listMoodBetween(userId, fortnight[0], todayKey);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const thisWeek = entries.filter((e) => e.date >= days[0]);
  const lastWeek = entries.filter((e) => e.date < days[0]);
  const mood: Series = days.map((d) => byDate.get(d)?.mood ?? null);
  const energy: Series = days.map((d) => byDate.get(d)?.energy ?? null);
  const summary = moodSummary(thisWeek, lastWeek);
  const energyAvg = averages(thisWeek).energy;

  return (
    <DashboardCard title="Mood trend" icon={TrendingUpIcon} href="/wellness/mood" release={6}>
      {thisWeek.length < 2 ? (
        <EmptyNote>
          {thisWeek.length === 0
            ? 'No check-ins in the last seven days, so there is no trend yet.'
            : 'Only one check-in in the last seven days, so there is no trend yet.'}{' '}
          <Link href="/wellness/mood" className="text-primary link">
            Check in.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <TrendLines mood={mood} energy={energy} days={days} />
            <div className="text-muted-foreground grid grid-cols-7 text-center text-[10px]">
              {days.map((d) => (
                <span
                  key={d}
                  className={cn(d === todayKey && 'text-primary font-medium')}
                  title={format(parseISO(d), 'EEE d MMM')}
                >
                  {format(parseISO(d), 'EEEEE')}
                </span>
              ))}
            </div>
          </div>
          <p className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="bg-plum inline-block h-0.5 w-3 rounded-full" aria-hidden /> Mood
            </span>
            <span className="flex items-center gap-1">
              <span className="border-rose inline-block w-3 border-t-2 border-dashed" aria-hidden />{' '}
              Energy
            </span>
          </p>
          <p className="text-sm">
            {summary}
            {energyAvg !== null && (
              <span className="text-muted-foreground"> Energy averaged {energyAvg}.</span>
            )}
          </p>
        </>
      )}
    </DashboardCard>
  );
}

/** Mood as a solid plum line with dots, energy as a dashed rose line; a day without a check-in leaves a gap. */
function TrendLines({ mood, energy, days }: { mood: Series; energy: Series; days: string[] }) {
  const m = lineGeometry(mood, BOX);
  const e = lineGeometry(energy, BOX);
  const described = days
    .map((d, i) =>
      mood[i] === null
        ? null
        : `${format(parseISO(d), 'EEE')} mood ${mood[i]} energy ${energy[i] ?? 'not set'}`
    )
    .filter(Boolean)
    .join(', ');
  const gridY = (v: number) => PAD + (HEIGHT - PAD * 2) * ((5 - v) / 4);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-14 w-full"
      role="img"
      aria-label={`Mood and energy over the last seven days: ${described}`}
    >
      {[1, 3, 5].map((v) => (
        <line
          key={v}
          x1={0}
          x2={WIDTH}
          y1={gridY(v)}
          y2={gridY(v)}
          stroke="var(--border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <g
        fill="none"
        stroke="var(--rose)"
        strokeWidth={2}
        strokeDasharray="4 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {e.runs.map((points) => (
          <polyline key={points} points={points} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g stroke="var(--rose)" strokeWidth={5} strokeLinecap="round">
        {e.singles.map((p) => (
          <line
            key={`${p.x}-${p.y}`}
            x1={p.x}
            y1={p.y}
            x2={p.x + 0.01}
            y2={p.y}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g fill="none" stroke="var(--plum)" strokeWidth={2} strokeLinejoin="round">
        {m.runs.map((points) => (
          <polyline key={points} points={points} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g stroke="var(--plum)" strokeWidth={6} strokeLinecap="round">
        {mood.map((v, i) =>
          v === null ? null : (
            <line
              key={days[i]}
              x1={(WIDTH / mood.length) * (i + 0.5)}
              y1={gridY(v)}
              x2={(WIDTH / mood.length) * (i + 0.5) + 0.01}
              y2={gridY(v)}
              vectorEffect="non-scaling-stroke"
            />
          )
        )}
      </g>
    </svg>
  );
}
