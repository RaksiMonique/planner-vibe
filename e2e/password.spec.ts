import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const EMAIL = 'password@planner.test';
const PASSWORD = 'correct-horse-battery-staple';

// Runs in the public project (no saved session).
test('sign in with an email and password', async ({ page }) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === EMAIL);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
  } else {
    await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  }

  await page.goto('/auth/login');
  await page.getByLabel('Email').last().fill(EMAIL);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: /sign in with password/i }).click();
  await expect(page.getByRole('alert').filter({ hasText: /don't match/i })).toBeVisible();

  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in with password/i }).click();
  // Not allow-listed, so the sign-in works but waits for approval.
  await expect(page).toHaveURL(/\/pending/);
  await expect(page.getByRole('heading', { name: /waiting for approval/i })).toBeVisible();
});
