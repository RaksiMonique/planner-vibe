import { expect, test } from '@playwright/test';

// Runs last (own project with dependencies) because signing out revokes the
// shared session every other authenticated test relies on.
test('sign out returns to the landing page', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/);
});
