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

test('the monthly money review sets a figure, adds a repeating task and finishes the month', async ({
  page,
}) => {
  const name = `Going out ${stamp}`;
  await page.goto('/finance');
  await page
    .getByRole('button', { name: /new budget/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Limit').fill('150');
  await dialog.getByRole('button', { name: 'Add budget' }).click();
  await expect(page.getByTestId('budget-row').filter({ hasText: name })).toBeVisible();

  await page.goto('/finance/review');
  await expect(page.getByRole('heading', { name: 'Monthly money review' }).first()).toBeVisible();
  const row = page.getByTestId('review-budget').filter({ hasText: name });
  await expect(row).toBeVisible();

  await row.getByLabel(new RegExp(`^Spent on ${name}`)).fill('80');
  await row.getByRole('button', { name: 'Set spent' }).click();
  await expect(row).toContainText('53% spent');

  const taskTitle = `Fewer nights out ${stamp}`;
  await row.getByLabel(`New task for ${name}`).fill(taskTitle);
  await row.getByRole('checkbox', { name: `Repeat the ${name} task every month` }).click();
  await row.getByRole('button', { name: 'Add task' }).click();
  await expect(row.getByText(taskTitle)).toBeVisible();
  await expect(row.getByLabel('Repeats')).toBeVisible();

  // The repeating reminder is created once; a second visit only reports it.
  const remind = page.getByRole('button', { name: 'Remind me every month' });
  if (await remind.isVisible()) await remind.click();
  await expect(page.getByText(/Reminder set: a Monthly money review task repeats/)).toBeVisible();

  await page.getByPlaceholder(/Where the money went/).fill('Fewer nights out next month.');
  await page.getByRole('button', { name: /Finish review|Update review/ }).click();
  await expect(page.getByText(/^Reviewed \d+ \w+$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update review' })).toBeVisible();

  // Reviewing the month in progress leaves the live counter alone.
  await page.goto('/finance');
  await expect(page.getByTestId('budget-row').filter({ hasText: name })).toContainText(
    /80\.00 of .*150\.00/
  );
});
