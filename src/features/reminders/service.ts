import 'server-only';
import { and, eq, isNull, lte, sql } from 'drizzle-orm';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { db } from '@/db';
import {
  events,
  habitCheckIns,
  habits,
  notifications,
  reminders,
  routines,
  tasks,
  timeBlocks,
} from '@/db/schema';
import { getPreferences } from '@/features/settings/service';
import { listRemindersFor, type Reminder } from './queries';
import {
  presetForReminder,
  resolveReminderAt,
  type ReminderAnchor,
  type ReminderInput,
  type ReminderPreset,
} from './schema';

export type ReminderEntity = Reminder['entityType'];

/** One reminder per record: replaces whatever was set before. */
export async function setReminder(
  userId: string,
  entityType: ReminderEntity,
  entityId: string,
  remindAt: Date
): Promise<void> {
  await clearReminder(userId, entityType, entityId);
  await db.insert(reminders).values({ userId, entityType, entityId, remindAt });
}

export async function clearReminder(
  userId: string,
  entityType: ReminderEntity,
  entityId: string
): Promise<void> {
  await db
    .delete(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.entityType, entityType),
        eq(reminders.entityId, entityId)
      )
    );
}

/** Applies a form's reminder fields to a record, given what the record is anchored to. */
export async function syncReminder(
  userId: string,
  entityType: ReminderEntity,
  entityId: string,
  input: ReminderInput,
  anchor: ReminderAnchor
): Promise<Date | null> {
  const at = resolveReminderAt(input.reminder, input.reminderAt, anchor);
  if (!at) {
    await clearReminder(userId, entityType, entityId);
    return null;
  }
  await setReminder(userId, entityType, entityId, at);
  return at;
}

/** What a record is anchored to, for turning its reminder back into a preset. */
async function anchorFor(
  userId: string,
  entityType: ReminderEntity,
  entityId: string,
  timeZone: string
): Promise<ReminderAnchor> {
  if (entityType === 'task') {
    const [t] = await db
      .select({ dueAt: tasks.dueAt, dueDate: tasks.dueDate })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, entityId)))
      .limit(1);
    return { dueAt: t?.dueAt ?? null, dueDateKey: t?.dueDate ?? null, timeZone };
  }
  if (entityType === 'event') {
    const [e] = await db
      .select({ startsAt: events.startsAt, allDayDate: events.allDayDate })
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.id, entityId)))
      .limit(1);
    return { dueAt: e?.startsAt ?? null, dueDateKey: e?.allDayDate ?? null, timeZone };
  }
  if (entityType === 'time_block') {
    const [b] = await db
      .select({ startsAt: timeBlocks.startsAt })
      .from(timeBlocks)
      .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, entityId)))
      .limit(1);
    return { dueAt: b?.startsAt ?? null, timeZone };
  }
  return { timeZone };
}

export async function reminderPresetFor(
  userId: string,
  entityType: ReminderEntity,
  entityId: string
): Promise<{ preset: ReminderPreset; custom: string }> {
  const [{ timeZone }, existing] = await Promise.all([
    getPreferences(userId),
    listRemindersFor(userId, entityType, entityId),
  ]);
  const anchor = await anchorFor(userId, entityType, entityId, timeZone);
  return presetForReminder(existing[0]?.remindAt ?? null, anchor);
}

type EntityInfo = { title: string; body: string; href: string };

/** Title, body and link for a due reminder; null when the record is gone or already done. */
async function describeEntity(
  userId: string,
  r: Reminder,
  timeZone: string
): Promise<EntityInfo | null> {
  const when = (d: Date) => formatInTimeZone(d, timeZone, 'EEE d MMM, HH:mm');
  const day = (key: string) =>
    formatInTimeZone(fromZonedTime(`${key}T12:00:00`, timeZone), timeZone, 'EEE d MMM');
  switch (r.entityType) {
    case 'task': {
      const [t] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.id, r.entityId), isNull(tasks.deletedAt)))
        .limit(1);
      if (!t || t.status === 'done') return null;
      const body = t.dueAt
        ? `Due ${when(t.dueAt)}`
        : t.dueDate
          ? `Due ${day(t.dueDate)}`
          : 'Task reminder';
      return { title: t.title, body, href: `/tasks?task=${t.id}` };
    }
    case 'event': {
      const [e] = await db
        .select()
        .from(events)
        .where(and(eq(events.userId, userId), eq(events.id, r.entityId), isNull(events.deletedAt)))
        .limit(1);
      if (!e) return null;
      const dateKey = e.isAllDay
        ? (e.allDayDate ?? '')
        : e.startsAt
          ? formatInTimeZone(e.startsAt, timeZone, 'yyyy-MM-dd')
          : '';
      const body = e.isAllDay
        ? `All day, ${e.allDayDate ? day(e.allDayDate) : 'today'}`
        : e.startsAt
          ? `Starts ${when(e.startsAt)}`
          : 'Event reminder';
      return { title: e.title, body, href: dateKey ? `/calendar?date=${dateKey}` : '/calendar' };
    }
    case 'habit': {
      const [h] = await db
        .select()
        .from(habits)
        .where(
          and(
            eq(habits.userId, userId),
            eq(habits.id, r.entityId),
            isNull(habits.deletedAt),
            isNull(habits.archivedAt)
          )
        )
        .limit(1);
      if (!h) return null;
      return { title: h.name, body: 'Habit check-in', href: '/habits' };
    }
    case 'routine': {
      const [row] = await db
        .select()
        .from(routines)
        .where(
          and(eq(routines.userId, userId), eq(routines.id, r.entityId), isNull(routines.deletedAt))
        )
        .limit(1);
      if (!row) return null;
      return { title: row.name, body: 'Routine', href: '/routines' };
    }
    case 'time_block': {
      const [b] = await db
        .select()
        .from(timeBlocks)
        .where(
          and(
            eq(timeBlocks.userId, userId),
            eq(timeBlocks.id, r.entityId),
            isNull(timeBlocks.deletedAt)
          )
        )
        .limit(1);
      if (!b) return null;
      return { title: b.title ?? 'Time block', body: `Starts ${when(b.startsAt)}`, href: '/time' };
    }
  }
}

/**
 * Habits with a reminder time get one reminder row per day once that time has
 * passed without a check-in. The generic generator then turns it into a notification.
 */
async function ensureHabitReminders(userId: string, now: Date, timeZone: string): Promise<void> {
  const todayKey = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
  const rows = await db
    .select({ id: habits.id, reminderTime: habits.reminderTime })
    .from(habits)
    .where(
      and(
        eq(habits.userId, userId),
        isNull(habits.deletedAt),
        isNull(habits.archivedAt),
        sql`${habits.reminderTime} is not null`
      )
    );
  if (rows.length === 0) return;
  const checked = await db
    .select({ habitId: habitCheckIns.habitId })
    .from(habitCheckIns)
    .where(and(eq(habitCheckIns.userId, userId), eq(habitCheckIns.date, todayKey)));
  const done = new Set(checked.map((c) => c.habitId));
  for (const h of rows) {
    if (!h.reminderTime || done.has(h.id)) continue;
    const remindAt = fromZonedTime(`${todayKey}T${h.reminderTime.slice(0, 5)}:00`, timeZone);
    if (remindAt > now) continue;
    const existing = await db
      .select({ id: reminders.id })
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.entityType, 'habit'),
          eq(reminders.entityId, h.id),
          eq(reminders.remindAt, remindAt)
        )
      )
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(reminders).values({ userId, entityType: 'habit', entityId: h.id, remindAt });
  }
}

/**
 * Turns every due, unsent reminder into a notification. Idempotent: the
 * notification's reminder_id is unique and the reminder is marked sent.
 * Returns how many notifications were created.
 */
export async function generateDueNotifications(
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const { timeZone } = await getPreferences(userId);
  await ensureHabitReminders(userId, now, timeZone);
  const due = await db
    .select()
    .from(reminders)
    .where(
      and(eq(reminders.userId, userId), isNull(reminders.sentAt), lte(reminders.remindAt, now))
    );
  let created = 0;
  for (const r of due) {
    const info = await describeEntity(userId, r, timeZone);
    if (info) {
      const inserted = await db
        .insert(notifications)
        .values({ userId, kind: 'reminder', reminderId: r.id, ...info })
        .onConflictDoNothing()
        .returning({ id: notifications.id });
      created += inserted.length;
    }
    await db.update(reminders).set({ sentAt: now }).where(eq(reminders.id, r.id));
  }
  return created;
}

export async function markRead(userId: string, id: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.id, id), isNull(notifications.readAt))
    );
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
