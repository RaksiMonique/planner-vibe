import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { db } from '@/db';
import { calendars, captures, events, lifeSegments } from '@/db/schema';
import { listMilestones } from '@/features/goals/queries';
import { getPreferences } from '@/features/settings/service';
import { listTasks } from '@/features/tasks/queries';
import { expandTimeBlocks } from '@/features/time/expand';
import { listTimeBlocksBetween } from '@/features/time/queries';
import { listExternalEventsBetween } from '@/features/integrations/google-sync';
import { listShiftCalendarItems } from '@/features/work/queries';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { toDateKey } from '@/lib/dates';
import { isBuiltInCategory, normalizeCategory } from './categories';
import { expandEvents, type CalendarItem } from './expand';
import { listCalendars, listEventsBetween, type Event } from './queries';
import {
  presetToRRule,
  rruleToPreset,
  type EventInput,
  type MoveInput,
  type RecurrencePreset,
} from './schema';

async function assertOwnedRefs(userId: string, calendarId: string, lifeSegmentId: string) {
  const [cal] = await db
    .select({ id: calendars.id })
    .from(calendars)
    .where(and(eq(calendars.userId, userId), eq(calendars.id, calendarId)))
    .limit(1);
  if (!cal) throw new ValidationError('Choose one of your calendars.');
  const [seg] = await db
    .select({ id: lifeSegments.id })
    .from(lifeSegments)
    .where(and(eq(lifeSegments.userId, userId), eq(lifeSegments.id, lifeSegmentId)))
    .limit(1);
  if (!seg) throw new ValidationError('Choose one of your Life Segments.');
}

/** Converts validated form input into the column values the events table stores. */
function toColumns(input: EventInput, timeZone: string) {
  const rrule = presetToRRule(input.recurrence);
  if (input.isAllDay) {
    const allDayDate = input.allDayDate!;
    return {
      isAllDay: true,
      allDayDate,
      startsAt: null,
      endsAt: null,
      rrule,
      dtstart: rrule ? new Date(`${allDayDate}T00:00:00Z`) : null,
    };
  }
  const startsAt = fromZonedTime(input.startsAt!, timeZone);
  const endsAt = fromZonedTime(input.endsAt!, timeZone);
  return {
    isAllDay: false,
    allDayDate: null,
    startsAt,
    endsAt,
    rrule,
    dtstart: rrule ? startsAt : null,
  };
}

export async function getEvent(userId: string, id: string): Promise<Event> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That event does not exist.');
  return row;
}

export async function createEvent(
  userId: string,
  input: EventInput,
  timeZone: string
): Promise<Event> {
  await assertOwnedRefs(userId, input.calendarId, input.lifeSegmentId);
  const [row] = await db
    .insert(events)
    .values({
      userId,
      title: input.title,
      calendarId: input.calendarId,
      lifeSegmentId: input.lifeSegmentId,
      category: input.category,
      location: input.location ?? null,
      description: input.description ?? null,
      ...toColumns(input, timeZone),
    })
    .returning();
  if (input.captureId) {
    await db
      .update(captures)
      .set({ convertedEntityType: 'event', convertedEntityId: row.id, convertedAt: new Date() })
      .where(
        and(
          eq(captures.userId, userId),
          eq(captures.id, input.captureId),
          isNull(captures.convertedAt)
        )
      );
  }
  return row;
}

export async function updateEvent(
  userId: string,
  id: string,
  input: EventInput,
  timeZone: string
): Promise<Event> {
  await getEvent(userId, id);
  await assertOwnedRefs(userId, input.calendarId, input.lifeSegmentId);
  const [row] = await db
    .update(events)
    .set({
      title: input.title,
      calendarId: input.calendarId,
      lifeSegmentId: input.lifeSegmentId,
      category: input.category,
      location: input.location ?? null,
      description: input.description ?? null,
      ...toColumns(input, timeZone),
    })
    .where(and(eq(events.userId, userId), eq(events.id, id)))
    .returning();
  return row;
}

/** Drag or resize. Moving a recurring definition moves the whole series. */
export async function moveEvent(userId: string, input: MoveInput): Promise<Event> {
  const current = await getEvent(userId, input.id);
  let patch: Partial<typeof events.$inferInsert>;
  if (input.allDay) {
    const allDayDate = input.start.slice(0, 10);
    patch = {
      isAllDay: true,
      allDayDate,
      startsAt: null,
      endsAt: null,
      dtstart: current.rrule ? new Date(`${allDayDate}T00:00:00Z`) : null,
    };
  } else {
    const startsAt = new Date(input.start);
    const previous =
      current.startsAt && current.endsAt
        ? current.endsAt.getTime() - current.startsAt.getTime()
        : 60 * 60 * 1000;
    const endsAt = input.end ? new Date(input.end) : new Date(startsAt.getTime() + previous);
    if (Number.isNaN(startsAt.getTime()) || endsAt <= startsAt)
      throw new ValidationError('That time range is not valid.');
    patch = {
      isAllDay: false,
      allDayDate: null,
      startsAt,
      endsAt,
      dtstart: current.rrule ? startsAt : null,
    };
  }
  const [row] = await db
    .update(events)
    .set(patch)
    .where(and(eq(events.userId, userId), eq(events.id, input.id)))
    .returning();
  return row;
}

export async function removeEvent(userId: string, id: string): Promise<void> {
  await getEvent(userId, id);
  await db
    .update(events)
    .set({ deletedAt: new Date() })
    .where(and(eq(events.userId, userId), eq(events.id, id)));
}

/** Form defaults for editing, with instants rendered in the user's zone for `datetime-local`. */
export type EventFormValues = {
  id: string;
  title: string;
  calendarId: string;
  lifeSegmentId: string;
  category: string;
  isAllDay: boolean;
  allDayDate: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  recurrence: RecurrencePreset;
};

export function toFormValues(row: Event, timeZone: string): EventFormValues {
  const local = (d: Date | null) => (d ? formatInTimeZone(d, timeZone, "yyyy-MM-dd'T'HH:mm") : '');
  return {
    id: row.id,
    title: row.title,
    calendarId: row.calendarId,
    lifeSegmentId: row.lifeSegmentId,
    category: row.category,
    isAllDay: row.isAllDay,
    allDayDate: row.allDayDate ?? '',
    startsAt: local(row.startsAt),
    endsAt: local(row.endsAt),
    location: row.location ?? '',
    description: row.description ?? '',
    recurrence: rruleToPreset(row.rrule),
  };
}

/** Everything the calendar draws for [from, to): events, open tasks with due dates, open milestones, time blocks and shifts. */
export async function buildCalendarItems(
  userId: string,
  from: Date,
  to: Date
): Promise<CalendarItem[]> {
  const [, prefs] = await Promise.all([listCalendars(userId), getPreferences(userId)]);
  const [blockRows, eventRows, taskRows, milestoneRows, shiftItems, externalRows] =
    await Promise.all([
      listTimeBlocksBetween(userId, from, to).catch(() => []),
      listEventsBetween(userId, from, to),
      listTasks(userId, {
        dueFrom: toDateKey(from),
        dueTo: toDateKey(to),
        onlyWithDueDate: true,
        status: 'open',
      }),
      listMilestones(userId, { dueFrom: toDateKey(from), dueTo: toDateKey(to), open: true }),
      // Shifts from the job calendar, read-only here, only while the work module is on.
      prefs.enabledModules.work === false
        ? Promise.resolve([] as CalendarItem[])
        : listShiftCalendarItems(userId, from, to, prefs.timeZone).catch(
            () => [] as CalendarItem[]
          ),
      // Events of the connected Google calendar, read-only here.
      listExternalEventsBetween(userId, from, to).catch(() => []),
    ]);
  const items = expandEvents(eventRows, from, to);
  for (const x of externalRows) {
    items.push({
      id: `external:${x.id}`,
      sourceId: x.id,
      type: 'external',
      title: x.title,
      allDay: x.isAllDay,
      start: x.isAllDay ? (x.allDayDate ?? '') : (x.startsAt?.toISOString() ?? ''),
      end: x.isAllDay ? x.allDayEnd : (x.endsAt?.toISOString() ?? null),
      accent: 'sage',
      calendarId: null,
      segmentId: null,
      recurring: false,
      url: x.htmlLink,
    });
  }
  for (const t of taskRows) {
    items.push({
      id: `task:${t.id}`,
      sourceId: t.id,
      type: 'task',
      title: t.title,
      allDay: true,
      start: t.dueDate!,
      end: null,
      accent: t.segment.accent,
      calendarId: null,
      segmentId: t.lifeSegmentId,
      recurring: false,
    });
  }
  for (const m of milestoneRows) {
    if (!m.dueDate) continue;
    items.push({
      id: `milestone:${m.id}`,
      sourceId: m.id,
      type: 'milestone',
      title: m.title,
      allDay: true,
      start: m.dueDate,
      end: null,
      accent: 'beige',
      calendarId: null,
      segmentId: null,
      recurring: false,
    });
  }
  // Planned time blocks, muted and read-only here; the time page edits them.
  // Recurring definitions are expanded into occurrences for the range.
  const segmentAccent = new Map(blockRows.map((b) => [b.lifeSegmentId, b.segment.accent]));
  for (const b of expandTimeBlocks(blockRows, from, to)) {
    items.push({
      id: `block:${b.id}`,
      sourceId: b.sourceId,
      type: 'time_block',
      title: b.title,
      allDay: false,
      start: b.start,
      end: b.end,
      accent: segmentAccent.get(b.segmentId) ?? b.accent,
      calendarId: null,
      segmentId: b.segmentId,
      recurring: b.recurring,
    });
  }
  items.push(...shiftItems);
  return items;
}

/** Renames one of the user's own categories on every event that carries it. */
export async function renameCategory(userId: string, from: string, to: string): Promise<void> {
  const target = normalizeCategory(to);
  if (isBuiltInCategory(from)) throw new ValidationError('Built-in categories keep their names.');
  await db
    .update(events)
    .set({ category: target })
    .where(and(eq(events.userId, userId), eq(events.category, from)));
}

/** Drops one of the user's own categories; its events become General. */
export async function removeCategory(userId: string, name: string): Promise<void> {
  if (isBuiltInCategory(name)) throw new ValidationError('Built-in categories cannot be removed.');
  await db
    .update(events)
    .set({ category: 'general' })
    .where(and(eq(events.userId, userId), eq(events.category, name)));
}
