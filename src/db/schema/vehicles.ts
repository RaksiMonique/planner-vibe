import { date, index, integer, text, uuid } from 'drizzle-orm/pg-core';
import { softDelete, timestamps, searchColumn } from './_columns';
import { ownerPolicies } from './_policies';
import { planner } from './_schema';
import { lifeSegments } from './organisation';
import { ownerId } from './profiles';

/** A car, bike or anything else with papers that run out (instructions.md 8.24). */
export const vehicles = planner.table(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    /** What the user calls it; falls back to year, make and model. */
    name: text('name'),
    make: text('make').notNull(),
    model: text('model').notNull(),
    year: integer('year'),
    colour: text('colour'),
    licensePlate: text('license_plate'),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...softDelete(),
    search: searchColumn(['name', 'make', 'model', 'license_plate', 'notes']),
    ...timestamps(),
  },
  (t) => [
    index('vehicles_search_idx').using('gin', t.search),
    index('vehicles_user_idx').on(t.userId, t.sortOrder),
    ...ownerPolicies('vehicles'),
  ]
);

/**
 * One dated paper for a vehicle: insurance, fitness, registration, the next
 * service, or anything the user names. `expires_on` drives the status and the
 * reminders; `reference` holds a policy or certificate number.
 */
export const vehicleDocuments = planner.table(
  'vehicle_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    expiresOn: date('expires_on').notNull(),
    reference: text('reference'),
    notes: text('notes'),
    ...timestamps(),
  },
  (t) => [
    index('vehicle_documents_vehicle_idx').on(t.vehicleId, t.expiresOn),
    index('vehicle_documents_user_expires_idx').on(t.userId, t.expiresOn),
    ...ownerPolicies('vehicle_documents'),
  ]
);

export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleDocument = typeof vehicleDocuments.$inferSelect;
