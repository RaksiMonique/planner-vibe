import { boolean, date, index, jsonb, text, time, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { softDelete, timestamps } from './_columns';
import { ownerPolicies } from './_policies';
import { accentEnum, lifeSegments } from './organisation';
import { ownerId } from './profiles';

/**
 * Job calendar (instructions.md 8.18). Shift patterns describe a repeating
 * cycle of days; shifts are the one-off and overriding days; leave and public
 * holidays take days out. Availability is derived from all four, never stored.
 * Work appointments are ordinary events on a calendar of kind `work`.
 */

export const shiftKindEnum = planner.enum('shift_kind', ['work', 'on_call', 'off']);
export const leaveKindEnum = planner.enum('leave_kind', ['annual', 'sick', 'unpaid', 'other']);
export const leaveStatusEnum = planner.enum('leave_status', ['planned', 'approved', 'taken']);

export type ShiftKind = (typeof shiftKindEnum.enumValues)[number];

/** One day of a rotating cycle. Times are 'HH:MM' in the user's time zone. */
export type PatternDay = {
  kind: ShiftKind;
  label?: string;
  start?: string;
  end?: string;
};

export const shiftPatterns = planner.table(
  'shift_patterns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    /** Day 0 of the cycle falls on this date; the cycle repeats from there. */
    anchorDate: date('anchor_date').notNull(),
    cycle: jsonb('cycle').$type<PatternDay[]>().notNull().default([]),
    accent: accentEnum('accent').notNull().default('burgundy'),
    isActive: boolean('is_active').notNull().default(true),
    note: text('note'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('shift_patterns_user_idx').on(t.userId), ...ownerPolicies('shift_patterns')]
);

/** A shift placed on a date by hand. Any row on a date replaces the pattern for that date. */
export const shifts = planner.table(
  'shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    patternId: uuid('pattern_id').references(() => shiftPatterns.id, { onDelete: 'set null' }),
    date: date('date').notNull(),
    kind: shiftKindEnum('kind').notNull().default('work'),
    label: text('label'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [index('shifts_user_date_idx').on(t.userId, t.date), ...ownerPolicies('shifts')]
);

export const leavePeriods = planner.table(
  'leave_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    kind: leaveKindEnum('kind').notNull().default('annual'),
    status: leaveStatusEnum('status').notNull().default('planned'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    note: text('note'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    index('leave_periods_user_start_idx').on(t.userId, t.startDate),
    ...ownerPolicies('leave_periods'),
  ]
);

/** Reference records entered by hand (no segment, like bible_books). */
export const publicHolidays = planner.table(
  'public_holidays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    date: date('date').notNull(),
    name: text('name').notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('public_holidays_user_date_idx').on(t.userId, t.date),
    ...ownerPolicies('public_holidays'),
  ]
);
