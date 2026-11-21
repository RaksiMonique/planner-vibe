import { expect, test } from './test';

/** The header's New button opens a task or an event form from any page. */
test('a task and an event can be started from the header on any page', async ({ page }) => {
  await page.goto('/goals');
  await page.getByRole('button', { name: 'New task or event' }).click();
  await page.getByRole('menuitem', { name: 'Task' }).click();
  await expect(page).toHaveURL(/\/tasks\?new=1/);
  await expect(page.getByRole('heading', { name: 'New task' })).toBeVisible();

  await page.goto('/prayer');
  await page.getByRole('button', { name: 'New task or event' }).click();
  await page.getByRole('menuitem', { name: 'Event' }).click();
  await expect(page).toHaveURL(/\/calendar\?new=1/);
  await expect(page.getByRole('heading', { name: 'New event' })).toBeVisible();
});
