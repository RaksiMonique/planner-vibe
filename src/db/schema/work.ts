import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  text,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
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
    /** Day 0 of the cycle falls on this date; the cycle repeats from there, in both directions. */
    anchorDate: date('anchor_date').notNull(),
    /** The pattern produces no days before `startDate` or after `endDate`; null is open-ended. */
    startDate: date('start_date'),
    endDate: date('end_date'),
    cycle: jsonb('cycle').$type<PatternDay[]>().notNull().default([]),
    accent: accentEnum('accent').notNull().default('burgundy'),
    isActive: boolean('is_active').notNull().default(true),
    note: text('note'),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [index('shift_patterns_user_idx').on(t.userId), ...ownerPolicies('shift_patterns')]
);

/**
 * A kind of shift of the user's own, such as "Night" or "Training". It counts
 * as one of the built-in kinds, which is what gives its days a status.
 */
export const shiftKinds = planner.table(
  'shift_kinds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text('name').notNull(),
    countsAs: shiftKindEnum('counts_as').notNull().default('work'),
    accent: accentEnum('accent').notNull().default('burgundy'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('shift_kinds_user_name_idx').on(t.userId, t.name),
    ...ownerPolicies('shift_kinds'),
  ]
);

/**
 * Shifts placed by hand: a single day, a block of days, or a block that comes
 * back every few weeks. Any day they cover replaces the pattern for that day.
 */
export const shifts = planner.table(
  'shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId(),
    lifeSegmentId: uuid('life_segment_id')
      .notNull()
      .references(() => lifeSegments.id, { onDelete: 'restrict' }),
    patternId: uuid('pattern_id').references(() => shiftPatterns.id, { onDelete: 'set null' }),
    /** First day of the shift. */
    date: date('date').notNull(),
    /** Last day of a block of days; null for a single day. */
    endDate: date('end_date'),
    /** What the day counts as; a custom kind's `countsAs` is copied here. */
    kind: shiftKindEnum('kind').notNull().default('work'),
    /** The user's own kind, when one was chosen; removing it leaves `kind` behind. */
    kindId: uuid('kind_id').references(() => shiftKinds.id, { onDelete: 'set null' }),
    label: text('label'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    /** 0 for a one-off; otherwise the block comes back every this many weeks or months. */
    repeatEvery: integer('repeat_every').notNull().default(0),
    repeatUnit: text('repeat_unit', { enum: ['week', 'month'] })
      .notNull()
      .default('week'),
    /** No day after this one is produced; null repeats for good. */
    repeatUntil: date('repeat_until'),
    note: text('note'),
    ...softDelete(),
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
