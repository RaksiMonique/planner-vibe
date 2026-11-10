import { sql } from 'drizzle-orm';
import { jsonb, pgPolicy, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { planner } from './_schema';
import { timestamps } from './_columns';
import { ownerPolicies } from './_policies';

/** Modules that can be switched off in Settings (instructions.md 2.3). */
export const MODULE_KEYS = [
  'planning',
  'life-segments',
  'faith',
  'study',
  'wellness',
  'habits',
  'routines',
  'time',
  'journal',
  'reviews',
  'meals',
  'media',
  'gifts',
  'vision-boards',
  'work',
  'notes',
  'important-info',
  'finance',
  /** Off by default (instructions.md 8.19). */
  'cycle-tracking',
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];
export type EnabledModules = Record<ModuleKey, boolean>;

export const DEFAULT_ENABLED_MODULES: EnabledModules = Object.fromEntries(
  MODULE_KEYS.map((key) => [key, key !== 'cycle-tracking'])
) as EnabledModules;

export const accessStatusEnum = planner.enum('access_status', ['pending', 'approved', 'blocked']);
export const profileRoleEnum = planner.enum('profile_role', ['owner', 'member']);

/**
 * Mirrors Supabase `auth.users`. The id is written by the `handle_new_user`
 * trigger on signup (drizzle/…_auth_profile_trigger.sql), never generated here.
 */
export const profiles = planner.table(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull().unique(),
    displayName: text('display_name'),
    /** Entry is granted by the owner (docs/decisions/0005); data isolation does not depend on it. */
    accessStatus: accessStatusEnum('access_status').notNull().default('pending'),
    role: profileRoleEnum('role').notNull().default('member'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),
    ...timestamps(),
  },
  () => [
    pgPolicy('profiles_select', { for: 'select', using: sql`auth.uid() = id` }),
    pgPolicy('profiles_insert', { for: 'insert', withCheck: sql`auth.uid() = id` }),
    pgPolicy('profiles_update', {
      for: 'update',
      using: sql`auth.uid() = id`,
      withCheck: sql`auth.uid() = id`,
    }),
    pgPolicy('profiles_delete', { for: 'delete', using: sql`auth.uid() = id` }),
  ]
);

/** The owning user column every user-owned table shares. */
export function ownerId() {
  return uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' });
}

export const userPreferences = planner.table(
  'user_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: ownerId().unique(),
    // IANA zone; "today" is computed server-side with it (instructions.md 5.4).
    timeZone: text('time_zone').notNull().default('America/Jamaica'),
    // 0 = Sunday … 6 = Saturday, matching date-fns `weekStartsOn`.
    weekStartsOn: smallint('week_starts_on').notNull().default(1),
    /** ISO 4217 code used for prices and budgets. */
    currency: text('currency').notNull().default('USD'),
    enabledModules: jsonb('enabled_modules')
      .$type<EnabledModules>()
      .notNull()
      .default(DEFAULT_ENABLED_MODULES),
    ...timestamps(),
  },
  () => [...ownerPolicies('user_preferences')]
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
