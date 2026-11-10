import { createClient } from '@supabase/supabase-js';

export const E2E_EMAIL = process.env.E2E_EMAIL ?? 'owner@planner.test';

/** Service-role client for the local Supabase stack. Refuses hosted projects. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars are missing; load .env.test.local first.');
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error('Refusing to run the test suite against a hosted Supabase project.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * A one-time sign-in path through the app's own callback, from a hashed magic
 * link token minted with the service role. Creates the user if needed.
 */
export async function mintSignInPath(email = E2E_EMAIL, next = '/dashboard') {
  const admin = adminClient();
  const { data: users } = await admin.auth.admin.listUsers();
  if (!users.users.some((u) => u.email === email)) {
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const token = data.properties.hashed_token;
  return `/auth/callback?token_hash=${token}&type=magiclink&next=${encodeURIComponent(next)}`;
}
