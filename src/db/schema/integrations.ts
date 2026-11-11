import { boolean, date, index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { ownerId } from './profiles';

/**
 * Release 6 integrations (instructions.md 9.1, 9.2): browser push
 * subscriptions, the Google Calendar connection and the read-only copy of its
 * events shown in the Life Calendar. Tokens are stored encrypted by the
 * service layer (src/lib/crypto.ts), never in clear text.
 */

export const calendarProviderEnum = planner.enum('calendar_provider', ['google']);
export const connectionStatusEnum = planner.enum('connection_status', [
  'connected',
  'error',
  'revoked',
]);

export const pushSubscriptions = planner.table(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('push_subscriptions_endpoint_idx').on(t.endpoint),
    index('push_subscriptions_user_idx').on(t.userId),
    ...ownerPolicies('push_subscriptions'),
  ]
);

export const calendarConnections = planner.table(
  'calendar_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    provider: calendarProviderEnum('provider').notNull().default('google'),
    accountEmail: text('account_email'),
    /** Encrypted with TOKEN_ENCRYPTION_KEY. */
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    /** The external calendar planner events are written to and read from. */
    calendarId: text('calendar_id'),
    calendarName: text('calendar_name'),
    syncToken: text('sync_token'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    status: connectionStatusEnum('status').notNull().default('connected'),
    lastError: text('last_error'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('calendar_connections_user_provider_idx').on(t.userId, t.provider),
    ...ownerPolicies('calendar_connections'),
  ]
);

/** Events pulled from the connected calendar; read-only in the planner. */
export const externalEvents = planner.table(
  'external_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => calendarConnections.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    location: text('location'),
    isAllDay: boolean('is_all_day').notNull().default(false),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    allDayDate: date('all_day_date'),
    allDayEnd: date('all_day_end'),
    htmlLink: text('html_link'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('external_events_connection_external_idx').on(t.connectionId, t.externalId),
    index('external_events_user_start_idx').on(t.userId, t.startsAt),
    ...ownerPolicies('external_events'),
  ]
);
