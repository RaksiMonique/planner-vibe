import { expect, test } from './test';

const stamp = Date.now().toString(36);

test('a lifelong goal breaks down in the Mandala view and shows on the horizon pages', async ({
  page,
}) => {
  const title = `Financial independence ${stamp}`;
  await page.goto('/goals');
  await page
    .getByRole('button', { name: /new goal|add goal|create goal/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Horizon').click();
  await page.getByRole('option', { name: 'Lifelong' }).click();
  await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByText(title).first()).toBeVisible();

  await page
    .getByRole('link', { name: new RegExp(title) })
    .first()
    .click();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);
  await page
    .getByRole('link', { name: /mandala/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/mandala$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // Breaking the goal down from an empty cell creates an annual sub-goal.
  const child = `Grow investments ${stamp}`;
  await page
    .getByRole('button', { name: /add sub-goal/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(child);
  await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByRole('link', { name: new RegExp(child) })).toBeVisible();

  // The goal page shows every horizon on one axis, and the lifelong page lists the aspiration.
  await page
    .getByRole('link', { name: /open goal/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /horizons/i })).toBeVisible();
  await page.goto('/lifelong');
  await expect(page.getByText(title).first()).toBeVisible();
  await expect(page.getByText(child).first()).toBeVisible();

  await page.goto('/year');
  await expect(page.getByRole('heading', { name: /^objectives$/i })).toBeVisible();
  await page.goto('/quarter');
  await expect(page.getByRole('heading', { name: /^objectives$/i })).toBeVisible();
});
