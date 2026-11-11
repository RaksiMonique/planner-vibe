import { expect, test } from './test';

const stamp = Date.now().toString(36);

test('the command palette finds a task by keyboard and opens it', async ({ page }) => {
  const title = `Renew the passport ${stamp}`;
  await page.goto('/tasks?new=1');
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(title).first()).toBeVisible();

  await page.goto('/dashboard');
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Search the planner' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('combobox', { name: 'Search the planner' });
  await expect(input).toBeFocused();
  await input.fill(stamp);

  const option = dialog.getByRole('option', { name: title });
  await expect(option).toBeVisible();
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/tasks\?task=[0-9a-f-]+/);
  await expect(page.getByRole('dialog').getByLabel('Title')).toHaveValue(title);
});

test('the command palette jumps to a page by name', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search the planner' });
  await dialog.getByRole('combobox', { name: 'Search the planner' }).fill('habits');
  await dialog.getByRole('option', { name: /^Habits/ }).click();
  await expect(page).toHaveURL(/\/habits$/);
});

test('the command palette captures unmatched text to the Inbox', async ({ page }) => {
  const text = `Zorblax quindle ${stamp}`;
  await page.goto('/goals');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search the planner' });
  await dialog.getByRole('combobox', { name: 'Search the planner' }).fill(text);
  await expect(dialog.getByText(`Nothing matches “${text}” yet.`)).toBeVisible();
  await dialog.getByRole('option', { name: `Capture “${text}” to the Inbox` }).click();
  await expect(dialog.getByRole('status')).toHaveText(`Captured “${text}” to the Inbox.`);

  await page.goto('/dashboard');
  await expect(page.getByText(text).first()).toBeVisible();
});
