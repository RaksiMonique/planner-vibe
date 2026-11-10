import { expect, test } from './test';

test('landing page renders @smoke', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Life Planner');
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
});

test('protected routes redirect to sign-in @smoke', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/login/);
});
