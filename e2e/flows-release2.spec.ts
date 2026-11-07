import { expect, test } from '@playwright/test';

const stamp = Date.now().toString(36);

test('create a habit and check it in for today', async ({ page }) => {
  const name = `Stretch ${stamp}`;
  await page.goto('/habits');
  await page
    .getByRole('button', { name: /new habit/i })
    .first()
    .click();
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create habit' }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  const toggle = page.getByRole('checkbox', { name: new RegExp(name) }).first();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
});

test('create a routine with a step and complete the step', async ({ page }) => {
  const name = `Evening wind-down ${stamp}`;
  await page.goto('/routines');
  await page
    .getByRole('button', { name: /new routine/i })
    .first()
    .click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Step 1 title').fill('Dim the lights');
  await page.getByRole('button', { name: 'Create routine' }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  const step = page.getByRole('checkbox', { name: `${name}: Dim the lights` }).first();
  await step.click();
  await expect(step).toBeChecked();
});

test('plan a time block from the dialog', async ({ page }) => {
  const title = `Deep work ${stamp}`;
  await page.goto('/time?view=day');
  await page.getByRole('button', { name: /new block/i }).click();
  await page.getByLabel('Title').fill(title);
  await page
    .getByRole('button', { name: /create|save|add/i })
    .last()
    .click();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
});

test('a task reminder in the past becomes a notification', async ({ page }) => {
  const title = `Call the bank ${stamp}`;
  const past = new Date(Date.now() - 10 * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}T${pad(past.getHours())}:${pad(past.getMinutes())}`;

  await page.goto('/tasks?new=1');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Remind me').selectOption('custom');
  await page.getByLabel('Reminder date and time').fill(local);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.goto('/dashboard');
  const bell = page.getByRole('button', { name: /notifications, \d+ unread/i });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page.getByText(title).first()).toBeVisible();
});
