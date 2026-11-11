import { cn } from '@/lib/utils';

export type Stat = {
  label: string;
  value: string;
  /** A second line: the comparison, the unit or the period. */
  hint?: string;
  tone?: 'default' | 'destructive';
};

/**
 * A row of headline numbers as a description list: the label names the
 * figure, the value is set in the body sans with proportional digits.
 */
export function StatTiles({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {stats.map((s) => (
        <div key={s.label} className="bg-card flex flex-col gap-0.5 rounded-xl border p-3">
          <dt className="text-muted-foreground text-xs">{s.label}</dt>
          <dd
            className={cn(
              'text-xl font-semibold sm:text-2xl',
              s.tone === 'destructive' && 'text-destructive'
            )}
          >
            {s.value}
          </dd>
          {s.hint && <dd className="text-muted-foreground text-xs">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
