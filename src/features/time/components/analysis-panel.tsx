import { format, parseISO } from 'date-fns';
import { ChartBarIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { cn } from '@/lib/utils';
import {
  NO_ACTIVITY,
  NO_PROJECT,
  plannedVsActualPercent,
  type MinutesBy,
  type WeekAnalysis,
} from '../analysis';
import { ACTIVITY_ACCENT, ACTIVITY_LABELS, formatMinutes, type ActivityType } from '../schema';
import { ACCENT_BG } from '@/lib/accents';

export type LabelMaps = {
  segments: Record<string, { name: string; accent: keyof typeof ACCENT_BG }>;
  projects: Record<string, string>;
};

function Bars({
  title,
  planned,
  actual,
  label,
  accentOf,
}: {
  title: string;
  planned: MinutesBy;
  actual: MinutesBy;
  label: (key: string) => string;
  accentOf?: (key: string) => keyof typeof ACCENT_BG | undefined;
}) {
  const keys = [...new Set([...Object.keys(planned), ...Object.keys(actual)])];
  const max = Math.max(1, ...keys.map((k) => Math.max(planned[k] ?? 0, actual[k] ?? 0)));
  if (keys.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="tracking-eyebrow text-muted-foreground text-[11px] uppercase">{title}</p>
      <ul className="flex flex-col gap-2">
        {keys
          .sort(
            (a, b) => (planned[b] ?? 0) + (actual[b] ?? 0) - ((planned[a] ?? 0) + (actual[a] ?? 0))
          )
          .map((key) => {
            const accent = accentOf?.(key);
            return (
              <li key={key} className="flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1.5">
                  {accent && <span className={cn('size-2 rounded-full', ACCENT_BG[accent])} />}
                  <span className="min-w-0 flex-1 truncate">{label(key)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatMinutes(actual[key] ?? 0)} of {formatMinutes(planned[key] ?? 0)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        accent ? ACCENT_BG[accent] : 'bg-primary'
                      )}
                      style={{ width: `${((planned[key] ?? 0) / max) * 100}%` }}
                      aria-hidden
                    />
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-charcoal/60 h-full rounded-full"
                      style={{ width: `${((actual[key] ?? 0) / max) * 100}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export function AnalysisPanel({ analysis, labels }: { analysis: WeekAnalysis; labels: LabelMaps }) {
  const percent = plannedVsActualPercent(analysis.plannedTotal, analysis.actualTotal);
  const maxDay = Math.max(1, ...analysis.byDay.map((d) => Math.max(d.planned, d.actual)));
  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      <h3 className="font-heading flex items-center gap-2 text-lg">
        <ChartBarIcon className="text-primary size-4" aria-hidden />
        Analysis
      </h3>
      <ProgressBar
        value={percent}
        label="Planned versus actual"
        valueText={`${formatMinutes(analysis.actualTotal)} of ${formatMinutes(analysis.plannedTotal)} planned`}
      />
      <p className="text-muted-foreground text-xs">Upper bar is planned, lower bar is logged.</p>

      <div className="flex flex-col gap-2">
        <p className="tracking-eyebrow text-muted-foreground text-[11px] uppercase">By day</p>
        <div className="grid grid-cols-7 gap-1">
          {analysis.byDay.map((d) => (
            <div
              key={d.key}
              className="flex flex-col items-center gap-1"
              title={`${formatMinutes(d.actual)} of ${formatMinutes(d.planned)}`}
            >
              <div className="flex h-20 w-full items-end justify-center gap-0.5">
                <div
                  className="bg-primary w-2 rounded-t"
                  style={{ height: `${(d.planned / maxDay) * 100}%` }}
                  aria-hidden
                />
                <div
                  className="bg-charcoal/60 w-2 rounded-t"
                  style={{ height: `${(d.actual / maxDay) * 100}%` }}
                  aria-hidden
                />
              </div>
              <span className="text-muted-foreground text-[10px]">
                {format(parseISO(d.key), 'EEEEE')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Bars
        title="By activity"
        planned={analysis.planned.byActivity}
        actual={analysis.actual.byActivity}
        label={(k) =>
          k === NO_ACTIVITY ? 'Not linked to a block' : (ACTIVITY_LABELS[k as ActivityType] ?? k)
        }
        accentOf={(k) => (k in ACTIVITY_ACCENT ? ACTIVITY_ACCENT[k as ActivityType] : undefined)}
      />
      <Bars
        title="By Life Segment"
        planned={analysis.planned.bySegment}
        actual={analysis.actual.bySegment}
        label={(k) => labels.segments[k]?.name ?? 'Unknown segment'}
        accentOf={(k) => labels.segments[k]?.accent}
      />
      <Bars
        title="By project"
        planned={analysis.planned.byProject}
        actual={analysis.actual.byProject}
        label={(k) => (k === NO_PROJECT ? 'No project' : (labels.projects[k] ?? 'Unknown project'))}
      />
    </section>
  );
}
