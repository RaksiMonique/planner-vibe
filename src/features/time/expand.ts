import { RRule } from 'rrule';
import type { Accent } from '@/lib/accents';
import { ACTIVITY_ACCENT, type ActivityType } from './schema';

/** One planned block drawn on the grid. Plain data so it can cross the server boundary. */
export type TimeBlockItem = {
  /** Unique per occurrence: `<sourceId>` or `<sourceId>:<date>` for recurring ones. */
  id: string;
  sourceId: string;
  title: string;
  /** ISO instants. */
  start: string;
  end: string;
  activityType: ActivityType;
  accent: Accent;
  segmentId: string;
  projectId: string | null;
  taskId: string | null;
  recurring: boolean;
};

/** The columns expansion needs; the full TimeBlockRow satisfies it. */
export type ExpandableBlock = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  activityType: ActivityType;
  lifeSegmentId: string;
  projectId: string | null;
  taskId: string | null;
  rrule: string | null;
  dtstart: Date | null;
  until: Date | null;
  /** yyyy-MM-dd keys (UTC date of the occurrence start) that are skipped. */
  exdates: string[];
};

const utcDateKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Turns block definitions into occurrences inside [from, to). Non-recurring
 * blocks pass through when they overlap the range; recurring ones are expanded
 * with the `rrule` package, honouring `until` and `exdates`, keeping the
 * definition's duration.
 */
export function expandTimeBlocks(rows: ExpandableBlock[], from: Date, to: Date): TimeBlockItem[] {
  const items: TimeBlockItem[] = [];
  for (const row of rows) {
    const base = {
      sourceId: row.id,
      title: row.title,
      activityType: row.activityType,
      accent: ACTIVITY_ACCENT[row.activityType] ?? 'terracotta',
      segmentId: row.lifeSegmentId,
      projectId: row.projectId,
      taskId: row.taskId,
    };
    const duration = row.endsAt.getTime() - row.startsAt.getTime();
    if (duration <= 0) continue;

    if (!row.rrule) {
      if (row.startsAt >= to || row.endsAt <= from) continue;
      items.push({
        ...base,
        id: row.id,
        start: row.startsAt.toISOString(),
        end: row.endsAt.toISOString(),
        recurring: false,
      });
      continue;
    }

    let rule: RRule;
    try {
      const opts = RRule.parseString(row.rrule);
      rule = new RRule({
        ...opts,
        dtstart: row.dtstart ?? row.startsAt,
        until: row.until ?? opts.until ?? null,
      });
    } catch {
      continue;
    }
    const excluded = new Set(row.exdates ?? []);
    // Widen the window by the duration so an occurrence that started before
    // `from` but is still running is included.
    const after = new Date(from.getTime() - duration);
    for (const occurrence of rule.between(after, to, true)) {
      if (occurrence >= to) continue;
      const key = utcDateKey(occurrence);
      if (excluded.has(key)) continue;
      items.push({
        ...base,
        id: `${row.id}:${key}`,
        start: occurrence.toISOString(),
        end: new Date(occurrence.getTime() + duration).toISOString(),
        recurring: true,
      });
    }
  }
  items.sort((a, b) => a.start.localeCompare(b.start));
  return items;
}
