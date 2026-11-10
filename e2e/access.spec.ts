import { expect, test, type Browser } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const GUEST = 'guest@planner.test';

async function signInAsGuest(browser: Browser, baseURL: string) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );
  const { data: users } = await admin.auth.admin.listUsers();
  if (!users.users.some((u) => u.email === GUEST)) {
    await admin.auth.admin.createUser({ email: GUEST, email_confirm: true });
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: GUEST });
  if (error) throw error;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    `${baseURL}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/dashboard`
  );
  return { context, page };
}

// Runs with the owner's saved session in `page`; the guest gets a fresh context.
test('a new sign-in waits until the owner approves, and a block locks them out again', async ({
  page,
  browser,
  baseURL,
}) => {
  // Reset the guest to pending so the test is repeatable.
  await page.goto('/settings/members');
  const row = page.locator('li', { hasText: GUEST });
  if ((await row.count()) > 0 && (await row.getByRole('button', { name: 'Block' }).count()) > 0) {
    await row.getByRole('button', { name: 'Block' }).click();
  }
  if (
    (await row.count()) > 0 &&
    (await row.getByRole('button', { name: 'Move to waiting' }).count()) > 0
  ) {
    await row.getByRole('button', { name: 'Move to waiting' }).click();
  }

  const guest = await signInAsGuest(browser, baseURL!);
  await expect(guest.page).toHaveURL(/\/pending/);
  await expect(guest.page.getByRole('heading', { name: /waiting for approval/i })).toBeVisible();
  await guest.page.goto(`${baseURL}/dashboard`);
  await expect(guest.page).toHaveURL(/\/pending/);

  await page.goto('/settings/members');
  await expect(page.locator('li', { hasText: GUEST })).toBeVisible();
  await page.locator('li', { hasText: GUEST }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.locator('li', { hasText: GUEST }).getByText('Member')).toBeVisible();

  await guest.page.goto(`${baseURL}/dashboard`);
  await expect(guest.page).toHaveURL(/\/dashboard/);

  await page.locator('li', { hasText: GUEST }).getByRole('button', { name: 'Block' }).click();
  await expect(page.locator('li', { hasText: GUEST }).getByText('Blocked')).toBeVisible();
  await guest.page.goto(`${baseURL}/dashboard`);
  await expect(guest.page).toHaveURL(/\/pending/);
  await expect(guest.page.getByRole('heading', { name: /access not available/i })).toBeVisible();
  await guest.context.close();
});
