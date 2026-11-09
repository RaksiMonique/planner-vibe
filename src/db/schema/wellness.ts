import { boolean, date, index, numeric, text, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';

export const wellnessKindEnum = planner.enum('wellness_kind', [
  'sleep',
  'water',
  'skincare',
  'haircare',
  'treatment',
  'fitness',
  'self_care',
  'cycle',
]);

/**
 * One wellness fact for a day: hours slept, litres drunk, a workout, a
 * treatment, a cycle note. Private by default: excluded from exports and any
 * future sharing unless explicitly included (instructions.md 8.19).
 */
export const wellnessEntries = planner.table(
  'wellness_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    kind: wellnessKindEnum('kind').notNull(),
    date: date('date').notNull(),
    /** Hours, litres, minutes, or a 1 to 5 level depending on the kind. */
    value: numeric('value', { precision: 10, scale: 2 }),
    unit: text('unit'),
    label: text('label'),
    note: text('note'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('wellness_entries_user_date_kind_idx').on(t.userId, t.date, t.kind),
    ...ownerPolicies('wellness_entries'),
  ]
);

/** Skincare, haircare and body products: inventory, favourites and wishlist in one table. */
export const products = planner.table(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    brand: text('brand'),
    category: text('category'),
    inInventory: boolean('in_inventory').notNull().default(true),
    isFavourite: boolean('is_favourite').notNull().default(false),
    onWishlist: boolean('on_wishlist').notNull().default(false),
    price: numeric('price', { precision: 10, scale: 2 }),
    currency: text('currency'),
    url: text('url'),
    imagePath: text('image_path'),
    openedOn: date('opened_on'),
    expiresOn: date('expires_on'),
    notes: text('notes'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('products_user_idx').on(t.userId, t.category), ...ownerPolicies('products')]
);

export type WellnessEntry = typeof wellnessEntries.$inferSelect;
export type Product = typeof products.$inferSelect;
