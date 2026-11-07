import { RRule } from 'rrule';
import type { Accent } from '@/lib/accents';

/** One thing drawn on the calendar. Plain data so it can cross the server boundary. */
export type CalendarItem = {
  /** Unique per occurrence: `<sourceId>` or `<sourceId>:<date>` for recurring ones. */
  id: string;
  sourceId: string;
  type: 'event' | 'task' | 'milestone';
  title: string;
  allDay: boolean;
  /** ISO instant, or yyyy-MM-dd when all-day. */
  start: string;
  end: string | null;
  accent: Accent;
  calendarId: string | null;
  segmentId: string | null;
  recurring: boolean;
};

/** The columns expansion needs; the full EventRow satisfies it. */
export type ExpandableEvent = {
  id: string;
  title: string;
  isAllDay: boolean;
  allDayDate: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  rrule: string | null;
  dtstart: Date | null;
  until: Date | null;
  /** yyyy-MM-dd keys (UTC date of the occurrence start) that are skipped. */
  exdates: string[];
  lifeSegmentId: string;
  calendarId: string;
  calendar: { accent: Accent };
};

const utcDateKey = (d: Date) => d.toISOString().slice(0, 10);
const allDayStart = (key: string) => new Date(`${key}T00:00:00Z`);

/**
 * Turns event definitions into occurrences inside [from, to). Non-recurring
 * events pass through when they overlap the range; recurring ones are expanded
 * with the `rrule` package, honouring `until` and `exdates`. Timed occurrences
 * keep the definition's duration.
 */
export function expandEvents(rows: ExpandableEvent[], from: Date, to: Date): CalendarItem[] {
  const items: CalendarItem[] = [];
  const fromKey = utcDateKey(from);
  const toKey = utcDateKey(to);

  for (const row of rows) {
    const base = {
      sourceId: row.id,
      type: 'event' as const,
      title: row.title,
      accent: row.calendar.accent,
      calendarId: row.calendarId,
      segmentId: row.lifeSegmentId,
    };

    if (!row.rrule) {
      if (row.isAllDay) {
        if (!row.allDayDate || row.allDayDate < fromKey || row.allDayDate > toKey) continue;
        items.push({
          ...base,
          id: row.id,
          allDay: true,
          start: row.allDayDate,
          end: null,
          recurring: false,
        });
      } else {
        if (!row.startsAt || !row.endsAt) continue;
        if (row.startsAt >= to || row.endsAt <= from) continue;
        items.push({
          ...base,
          id: row.id,
          allDay: false,
          start: row.startsAt.toISOString(),
          end: row.endsAt.toISOString(),
          recurring: false,
        });
      }
      continue;
    }

    const dtstart =
      row.dtstart ?? (row.isAllDay && row.allDayDate ? allDayStart(row.allDayDate) : row.startsAt);
    if (!dtstart) continue;
    let rule: RRule;
    try {
      const opts = RRule.parseString(row.rrule);
      rule = new RRule({ ...opts, dtstart, until: row.until ?? opts.until ?? null });
    } catch {
      continue;
    }
    const duration =
      !row.isAllDay && row.startsAt && row.endsAt
        ? row.endsAt.getTime() - row.startsAt.getTime()
        : 0;
    const excluded = new Set(row.exdates ?? []);
    // Widen the window by the duration so an occurrence that started before
    // `from` but is still running is included.
    const after = new Date(from.getTime() - duration);
    for (const occurrence of rule.between(after, to, true)) {
      if (occurrence >= to) continue;
      const key = utcDateKey(occurrence);
      if (excluded.has(key)) continue;
      if (row.isAllDay) {
        items.push({
          ...base,
          id: `${row.id}:${key}`,
          allDay: true,
          start: key,
          end: null,
          recurring: true,
        });
      } else {
        items.push({
          ...base,
          id: `${row.id}:${key}`,
          allDay: false,
          start: occurrence.toISOString(),
          end: new Date(occurrence.getTime() + duration).toISOString(),
          recurring: true,
        });
      }
    }
  }
  return items;
}
