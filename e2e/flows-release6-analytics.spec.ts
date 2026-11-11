import { expect, test } from './test';

const stamp = Date.now().toString(36);

const SECTIONS = [
  'Goal completion',
  'Habit consistency',
  'Time allocation',
  'Projects and milestones',
  'Mood and energy trends',
  'Summary',
  'Life balance',
];

async function expectSections(page: Parameters<Parameters<typeof test>[2]>[0]['page']) {
  for (const name of SECTIONS) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
}

test('analytics shows every section and switches between month, quarter and year', async ({
  page,
}) => {
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics' }).first()).toBeVisible();
  await expectSections(page);
  // The default period is the current month, e.g. "November 2026".
  const periodHeading = page.getByRole('heading', { level: 3 }).first();
  await expect(periodHeading).toHaveText(/^[A-Z][a-z]+ 20\d\d$/);

  // The sidebar also links to /quarter and /year, so scope to the period switch.
  const lengths = page.getByRole('group', { name: 'Period length' });
  await lengths.getByRole('link', { name: 'Quarter', exact: true }).click();
  await expect(page).toHaveURL(/period=quarter/);
  await expect(page.getByRole('heading', { level: 3 }).first()).toHaveText(/^Q[1-4] 20\d\d$/);
  await expectSections(page);

  await lengths.getByRole('link', { name: 'Year', exact: true }).click();
  await expect(page).toHaveURL(/period=year/);
  await expect(page.getByRole('heading', { level: 3 }).first()).toHaveText(/^20\d\d$/);
  await expectSections(page);

  // Previous and next move the period; "This year" comes back.
  await page.getByRole('link', { name: 'Previous year' }).click();
  await expect(page).toHaveURL(/period=year&start=20\d\d/);
  await page.getByRole('link', { name: 'This year' }).click();
  await expect(page).toHaveURL(/\/analytics\?period=year$/);
});

test('a habit checked in today is listed under habit consistency', async ({ page }) => {
  const name = `Evening walk ${stamp}`;
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

  await page.goto('/analytics');
  const section = page.getByTestId('analytics-habits');
  await expect(section.getByRole('heading', { name: 'Habit consistency' })).toBeVisible();
  const row = section.getByRole('row').filter({ hasText: name });
  await expect(row).toBeVisible();
  // One check-in against the days of the month so far, and a one-day streak.
  await expect(row).toContainText(/\b1 of \d+\b/);
  await expect(row).toContainText('1 day');
});
