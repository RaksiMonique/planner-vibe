import { expect, test } from './test';

const stamp = Date.now().toString(36);

/** Forms open over the current page; nothing navigates away. */
test('a task and an event can be started from the header without leaving the page', async ({
  page,
}) => {
  await page.goto('/goals');
  await page.getByRole('button', { name: 'New task or event' }).click();
  await page.getByRole('menuitem', { name: 'Task' }).click();
  await expect(page).toHaveURL(/\/goals\?new=task$/);
  const sheet = page.getByRole('dialog', { name: 'New task' });
  await expect(sheet).toBeVisible();
  const title = `Water the plants ${stamp}`;
  await sheet.getByLabel('Title').fill(title);
  await sheet.getByRole('button', { name: 'Add task' }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(page.getByRole('heading', { name: 'Goals' }).first()).toBeVisible();

  await page.goto('/prayer');
  await page.getByRole('button', { name: 'New task or event' }).click();
  await page.getByRole('menuitem', { name: 'Event' }).click();
  await expect(page).toHaveURL(/\/prayer\?new=event$/);
  const dialog = page.getByRole('dialog', { name: 'New event' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/prayer$/);
});

test('editing a task from the Today page keeps you on the Today page', async ({ page }) => {
  await page.goto('/dashboard');
  const link = page.locator('[data-slot=today-block] a[href*="task="]').first();
  test.skip((await link.count()) === 0, 'No task on the Today page for this user');
  const title = (await link.textContent())?.trim() ?? '';
  await link.click();
  await expect(page).toHaveURL(/\/dashboard\?task=/);
  const sheet = page.getByRole('dialog', { name: 'Edit task' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel('Title')).toHaveValue(title);
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/dashboard$/);
});
