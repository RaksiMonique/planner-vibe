import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, reminders } from '@/db/schema';

export type Reminder = typeof reminders.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export async function listNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
  const conds = [eq(notifications.userId, userId)];
  if (opts.unreadOnly) conds.push(isNull(notifications.readAt));
  return db
    .select()
    .from(notifications)
    .where(and(...conds))
    .orderBy(desc(notifications.createdAt))
    .limit(opts.limit ?? 50);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.count ?? 0;
}

export async function listRemindersFor(
  userId: string,
  entityType: Reminder['entityType'],
  entityId: string
): Promise<Reminder[]> {
  return db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.entityType, entityType),
        eq(reminders.entityId, entityId)
      )
    )
    .orderBy(reminders.remindAt);
}
