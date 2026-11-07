import { index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { ownerId } from './profiles';

export const reminderEntityEnum = planner.enum('reminder_entity', [
  'task',
  'event',
  'habit',
  'routine',
  'time_block',
]);
export const notificationKindEnum = planner.enum('notification_kind', ['reminder', 'system']);

/** A scheduled nudge for one record. Release 2 delivers in-app only (instructions.md 9.2). */
export const reminders = planner.table(
  'reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    entityType: reminderEntityEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    /** Set once a notification has been generated for it. */
    sentAt: timestamp('sent_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('reminders_user_remind_idx').on(t.userId, t.remindAt),
    index('reminders_entity_idx').on(t.entityType, t.entityId),
    ...ownerPolicies('reminders'),
  ]
);

/** The in-app notification feed. */
export const notifications = planner.table(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    kind: notificationKindEnum('kind').notNull().default('reminder'),
    title: text('title').notNull(),
    body: text('body'),
    /** Where clicking the notification goes. */
    href: text('href'),
    reminderId: uuid('reminder_id').references(() => reminders.id, { onDelete: 'set null' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('notifications_user_created_idx').on(t.userId, t.createdAt),
    uniqueIndex('notifications_reminder_idx').on(t.reminderId),
    ...ownerPolicies('notifications'),
  ]
);

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
