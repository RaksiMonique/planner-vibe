import 'server-only';
import { and, asc, eq, gt, gte, isNull, lt, lte, notInArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { calendars, events, lifeSegments } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import { toDateKey } from '@/lib/dates';
import { EVENT_CATEGORIES } from './categories';

export type Calendar = typeof calendars.$inferSelect;
export type Event = typeof events.$inferSelect;
export type CalendarRef = Pick<Calendar, 'id' | 'name' | 'kind' | 'accent'>;
export type EventRow = Event & { segment: SegmentRef; calendar: CalendarRef };

/** Returns the user's calendars, creating Personal and Work the first time. */
export async function listCalendars(userId: string): Promise<Calendar[]> {
  const rows = await db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .orderBy(asc(calendars.createdAt));
  if (rows.length > 0) return rows;
  await db
    .insert(calendars)
    .values([
      { userId, name: 'Personal', kind: 'personal', accent: 'burgundy' },
      { userId, name: 'Work', kind: 'work', accent: 'terracotta' },
    ])
    .onConflictDoNothing();
  return db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .orderBy(asc(calendars.createdAt));
}

/** Category labels the user typed themselves, alive while an event carries them. */
export async function listCustomCategories(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: events.category })
    .from(events)
    .where(
      and(
        eq(events.userId, userId),
        isNull(events.deletedAt),
        notInArray(events.category, [...EVENT_CATEGORIES])
      )
    )
    .orderBy(asc(events.category));
  return rows.map((r) => r.category);
}

/**
 * Events overlapping [from, to). Timed events compare instants; all-day
 * events compare their date against the range's calendar dates. Recurring
 * events are returned as their definition row (expansion is the caller's job).
 */
export async function listEventsBetween(userId: string, from: Date, to: Date): Promise<EventRow[]> {
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  const rows = await db
    .select({
      event: events,
      segment: segmentRefColumns,
      calendar: {
        id: calendars.id,
        name: calendars.name,
        kind: calendars.kind,
        accent: calendars.accent,
      },
    })
    .from(events)
    .innerJoin(lifeSegments, eq(events.lifeSegmentId, lifeSegments.id))
    .innerJoin(calendars, eq(events.calendarId, calendars.id))
    .where(
      and(
        eq(events.userId, userId),
        isNull(events.deletedAt),
        eq(calendars.isEnabled, true),
        or(
          and(
            eq(events.isAllDay, true),
            gte(events.allDayDate, fromKey),
            lte(events.allDayDate, toKey)
          ),
          and(eq(events.isAllDay, false), lt(events.startsAt, to), gt(events.endsAt, from)),
          // recurring definitions are always returned so the caller can expand them
          sql`${events.rrule} is not null`
        )
      )
    )
    .orderBy(asc(events.allDayDate), asc(events.startsAt));
  return rows.map((r) => ({ ...r.event, segment: r.segment, calendar: r.calendar }));
}
