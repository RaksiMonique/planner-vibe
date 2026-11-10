import { E2E_EMAIL, mintSignInPath } from './auth';
import { expect, test } from './test';

// Runs last (own project with dependencies) because signing out revokes the
// shared session every other authenticated test relies on. Serial: the first
// test revokes that session, so the second signs in afresh.
test.describe.configure({ mode: 'serial' });

test('sign out returns to the landing page', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('set a password under Settings, sign out, and sign back in with it', async ({ page }) => {
  await page.goto(await mintSignInPath(E2E_EMAIL, '/settings'));
  await expect(page).toHaveURL(/\/settings/);

  const password = `Planner-${Date.now().toString(36)}-secret`;
  await page.getByLabel('New password').fill(password);
  await page.getByLabel('Repeat it').fill(password);
  await page.getByRole('button', { name: 'Set password' }).click();
  await expect(page.getByText(/saved\. you can sign in with it/i)).toBeVisible();

  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/auth/login');
  await page.getByLabel('Email').first().fill(E2E_EMAIL);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
