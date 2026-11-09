import { date, index, numeric, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';

export const giftStatusEnum = planner.enum('gift_status', [
  'idea',
  'planned',
  'purchased',
  'wrapped',
  'given',
]);

export const giftRecipients = planner.table(
  'gift_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    relationship: text('relationship'),
    birthday: date('birthday'),
    notes: text('notes'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('gift_recipients_user_idx').on(t.userId, t.name),
    ...ownerPolicies('gift_recipients'),
  ]
);

export const gifts = planner.table(
  'gifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => giftRecipients.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    occasion: text('occasion'),
    occasionDate: date('occasion_date'),
    status: giftStatusEnum('status').notNull().default('idea'),
    budget: numeric('budget', { precision: 10, scale: 2 }),
    price: numeric('price', { precision: 10, scale: 2 }),
    url: text('url'),
    notes: text('notes'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('gifts_user_occasion_idx').on(t.userId, t.occasionDate),
    index('gifts_recipient_idx').on(t.recipientId),
    ...ownerPolicies('gifts'),
  ]
);

/** The user's own wishlist. */
export const wishlistItems = planner.table(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    title: text('title').notNull(),
    url: text('url'),
    price: numeric('price', { precision: 10, scale: 2 }),
    priority: smallint('priority').notNull().default(2),
    notes: text('notes'),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('wishlist_items_user_idx').on(t.userId, t.priority),
    ...ownerPolicies('wishlist_items'),
  ]
);

export type GiftRecipient = typeof giftRecipients.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
