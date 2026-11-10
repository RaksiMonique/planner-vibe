import { chromium, expect, type FullConfig } from '@playwright/test';
import { mintSignInPath } from './auth';

/**
 * Signs the test user in through the app's own callback using a hashed magic
 * link token minted with the service role, and saves the session cookies for
 * every authenticated test. Needs `npx supabase start` and the env files that
 * point at it (see README).
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3101';
  const path = await mintSignInPath();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}${path}`);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: 'e2e/.auth/owner.json' });
  await browser.close();
}
