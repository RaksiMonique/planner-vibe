import { expect, test } from './test';

const stamp = Date.now().toString(36);

test('create a budget, record spending and see the spent figure', async ({ page }) => {
  const name = `Groceries ${stamp}`;
  await page.goto('/finance');
  await expect(page.getByRole('heading', { name: 'Financial snapshot' }).first()).toBeVisible();

  await page
    .getByRole('button', { name: /new budget/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Limit').fill('200');
  await dialog.getByRole('button', { name: 'Add budget' }).click();

  const row = page.getByTestId('budget-row').filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row).toContainText(/0\.00 of .*200\.00/);
  await expect(row).toContainText('0% spent');

  await row.getByLabel(`Record spending for ${name}`).fill('45.5');
  await row.getByRole('button', { name: 'Record' }).click();
  await expect(row).toContainText(/45\.50 of .*200\.00/);
  await expect(row).toContainText('23% spent');
  await expect(row).toContainText(/154\.50 remaining/);
});

test('update a financial goal from the snapshot', async ({ page }) => {
  await page.goto('/finance');
  const goal = page
    .getByTestId('financial-goal')
    .filter({ has: page.getByRole('button', { name: 'Update progress' }) })
    .first();
  const hasMeasurableGoal = (await goal.count()) > 0;
  test.skip(!hasMeasurableGoal, 'No measurable goal in the Finance segment for this user');

  const value = 1000 + (Date.now() % 9000);
  await goal.getByRole('spinbutton', { name: /update progress for/i }).fill(String(value));
  await goal.getByRole('button', { name: 'Update progress' }).click();
  await expect(goal).toContainText(`${value.toLocaleString('en-GB')} /`);
});

test('time analytics renders the current week and switches to the month', async ({ page }) => {
  await page.goto('/time/analytics?range=week');
  await expect(page.getByRole('heading', { name: 'Time analytics' }).first()).toBeVisible();
  const totals = page.getByText('Planned', { exact: true }).first();
  const empty = page.getByText('Nothing planned or logged');
  await expect(totals.or(empty).first()).toBeVisible();

  await page.getByRole('link', { name: 'Month', exact: true }).click();
  await expect(page).toHaveURL(/range=month/);
  await expect(page.getByRole('heading', { name: 'Time analytics' }).first()).toBeVisible();
  await expect(totals.or(empty).first()).toBeVisible();
});
