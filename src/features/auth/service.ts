import 'server-only';
import { db } from '@/db';
import { profiles, userPreferences } from '@/db/schema';

/**
 * Makes sure the planner has a profile and preferences row for this auth user.
 * The database trigger covers users created after the planner's migration;
 * this covers everyone who already existed in the shared Supabase project.
 */
export async function ensureProfile(user: {
  id: string;
  email?: string | null;
  displayName?: string | null;
}) {
  if (!user.email) return;
  await db
    .insert(profiles)
    .values({ id: user.id, email: user.email, displayName: user.displayName ?? null })
    .onConflictDoNothing();
  await db.insert(userPreferences).values({ userId: user.id }).onConflictDoNothing();
}
