import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

/**
 * Standard row-level security for a user-owned table (instructions.md 4.1).
 *
 * The app connects directly and always filters by `user_id`; these policies
 * are the second line of defence for anything that reaches Postgres through
 * the Supabase API with a user JWT. drizzle-kit push drops any policy not
 * declared in code, so every policy must live here.
 */
export function ownerPolicies(table: string) {
  const owner = sql`auth.uid() = user_id`;
  return [
    pgPolicy(`${table}_select`, { for: 'select', using: owner }),
    pgPolicy(`${table}_insert`, { for: 'insert', withCheck: owner }),
    pgPolicy(`${table}_update`, { for: 'update', using: owner, withCheck: owner }),
    pgPolicy(`${table}_delete`, { for: 'delete', using: owner }),
  ];
}
