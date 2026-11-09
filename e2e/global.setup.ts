import { chromium, expect, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Signs the test user in through the app's own callback using a hashed magic
 * link token minted with the service role, and saves the session cookies for
 * every authenticated test. Needs `npx supabase start` and the env files that
 * point at it (see README).
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3100';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_EMAIL ?? 'owner@planner.test';
  if (!url || !key) throw new Error('Supabase env vars are missing; load .env.test.local first.');
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error('Refusing to run the test suite against a hosted Supabase project.');
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: users } = await admin.auth.admin.listUsers();
  if (!users.users.some((u) => u.email === email)) {
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const tokenHash = data.properties.hashed_token;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(
    `${baseURL}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=/dashboard`
  );
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: 'e2e/.auth/owner.json' });
  await browser.close();
}
