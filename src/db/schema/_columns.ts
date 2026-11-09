import { date, jsonb, text, timestamp } from 'drizzle-orm/pg-core';

/** `created_at` / `updated_at` as timestamptz (instructions.md 5.2, 5.4). */
export function timestamps() {
  return {
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  };
}

/** Soft-delete marker for user-facing content (instructions.md 5.2). */
export function softDelete() {
  return { deletedAt: timestamp('deleted_at', { withTimezone: true }) };
}

/**
 * Recurrence columns shared by tasks, events and time blocks (instructions.md 5.4).
 *
 * `rrule` is an RFC 5545 rule string expanded on read for the requested range.
 * `exdates` holds excluded ISO dates. A materialised occurrence (completed,
 * edited or moved) is its own row carrying `occurrence_date` and pointing at
 * the definition through `recurrence_parent_id`, which each table declares
 * itself because it is a self reference.
 */
export function recurrence() {
  return {
    rrule: text('rrule'),
    dtstart: timestamp('dtstart', { withTimezone: true }),
    until: timestamp('until', { withTimezone: true }),
    exdates: jsonb('exdates').$type<string[]>().notNull().default([]),
    occurrenceDate: date('occurrence_date'),
  };
}
