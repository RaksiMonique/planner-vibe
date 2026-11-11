import { expect, test } from './test';

const stamp = Date.now().toString(36);

// A month far from today, so the live schedule around today is left alone.
const MONTH = '2027-03';
const ANCHOR = '2027-03-01'; // a Monday

test('a shift pattern fills the job calendar and leave takes its days back out', async ({
  page,
}) => {
  const name = `Rota ${stamp}`;
  const label = `Day ${stamp}`;
  const cell = (date: string) => page.locator(`li[data-date="${date}"]`);

  await page.goto(`/work/calendar?month=${MONTH}`);
  await expect(page.getByRole('heading', { name: 'Job calendar' }).first()).toBeVisible();

  // Two days on, two days off, anchored on the first of the month.
  await page.getByRole('button', { name: 'New pattern' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Anchor date').fill(ANCHOR);
  await dialog.getByRole('button', { name: '2 on, 2 off' }).click();
  await dialog.getByLabel('Day 1 label').fill(label);
  await dialog.getByLabel('Day 2 label').fill(label);
  await dialog.getByRole('button', { name: 'Create pattern' }).click();
  await expect(dialog).toBeHidden();

  await expect(cell('2027-03-01')).toHaveAttribute('data-status', 'working');
  await expect(cell('2027-03-01').getByText(label).first()).toBeVisible();
  await expect(cell('2027-03-02')).toHaveAttribute('data-status', 'working');
  await expect(cell('2027-03-03')).toHaveAttribute('data-status', 'off');
  await expect(cell('2027-03-03').getByText(label)).toHaveCount(0);
  await expect(cell('2027-03-04')).toHaveAttribute('data-status', 'off');
  await expect(cell('2027-03-05')).toHaveAttribute('data-status', 'working');
  await expect(page.getByText(name).filter({ visible: true }).first()).toBeVisible();

  // Leave over a working day wins over the pattern.
  await page.getByRole('button', { name: 'Add leave' }).first().click();
  const leave = page.getByRole('dialog');
  await leave.getByLabel('Start').fill('2027-03-05');
  await leave.getByLabel('End').fill('2027-03-06');
  await leave.getByRole('button', { name: 'Add leave' }).click();
  await expect(leave).toBeHidden();
  await expect(cell('2027-03-05')).toHaveAttribute('data-status', 'leave');
  await expect(cell('2027-03-06')).toHaveAttribute('data-status', 'leave');
  await expect(cell('2027-03-05').getByText('Annual leave')).toBeVisible();

  // Tidy up through the UI so the next run starts from the same place.
  const leaveRow = page.locator('li', { hasText: '6 Mar 2027' }).first();
  await leaveRow.getByRole('button', { name: 'Remove Annual leave' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(cell('2027-03-05')).toHaveAttribute('data-status', 'working');

  await page.getByRole('button', { name: `Delete ${name}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(name)).toHaveCount(0);
  await expect(cell('2027-03-01').getByText(label)).toHaveCount(0);
});

test('work projects lists the projects in the work segment', async ({ page }) => {
  await page.goto('/work/projects');
  await expect(page.getByRole('heading', { name: 'Work projects' }).first()).toBeVisible();
  // Either the seeded work project or the empty state that explains where projects come from.
  await expect(
    page
      .getByRole('link', { name: /Build the Life Planner website/ })
      .or(page.getByText(/segment appear here/))
      .first()
  ).toBeVisible();
});
