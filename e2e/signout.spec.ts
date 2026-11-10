import { expect, test } from '@playwright/test';

// Runs last (own project with dependencies) because signing out revokes the
// shared session every other authenticated test relies on.
test('sign out returns to the landing page', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('set a password under Settings, sign out, and sign back in with it', async ({ page }) => {
  const password = `Planner-${Date.now().toString(36)}-secret`;
  await page.goto('/settings');
  await page.getByLabel('New password').fill(password);
  await page.getByLabel('Repeat it').fill(password);
  await page.getByRole('button', { name: 'Set password' }).click();
  await expect(page.getByText(/saved\. you can sign in with it/i)).toBeVisible();

  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/auth/login');
  await page.getByLabel('Email').last().fill('owner@planner.test');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in with password/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
