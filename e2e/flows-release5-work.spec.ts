import type { Page } from '@playwright/test';
import { addDays, format, parseISO } from 'date-fns';
import { expect, test } from './test';

const stamp = Date.now().toString(36);

// A month far from today, so the live schedule around today is left alone.
const MONTH = '2027-03';
const ANCHOR = '2027-03-01'; // a Monday

const cellOn = (page: Page) => (date: string) => page.locator(`li[data-date="${date}"]`);
const daysAfter = (base: string) => (offset: number) =>
  format(addDays(parseISO(base), offset), 'yyyy-MM-dd');

test('a shift pattern fills the job calendar and leave takes its days back out', async ({
  page,
  isMobile,
}) => {
  const name = `Rota ${stamp}`;
  const label = `Day ${stamp}`;
  const cell = cellOn(page);
  // Desktop and mobile run at once against one account; their patterns are identical, so
  // each checks its own stretch of the month and places its leave there.
  const day = daysAfter(isMobile ? '2027-03-13' : ANCHOR);

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

  await expect(cell(day(0))).toHaveAttribute('data-status', 'working');
  await expect(cell(day(0)).getByText(label).first()).toBeVisible();
  await expect(cell(day(1))).toHaveAttribute('data-status', 'working');
  await expect(cell(day(2))).toHaveAttribute('data-status', 'off');
  await expect(cell(day(2)).getByText(label)).toHaveCount(0);
  await expect(cell(day(3))).toHaveAttribute('data-status', 'off');
  await expect(cell(day(4))).toHaveAttribute('data-status', 'working');
  await expect(page.getByText(name).filter({ visible: true }).first()).toBeVisible();

  // Leave over a working day wins over the pattern.
  await page.getByRole('button', { name: 'Add leave' }).first().click();
  const leave = page.getByRole('dialog');
  await leave.getByLabel('Start').fill(day(4));
  await leave.getByLabel('End').fill(day(3));
  await expect(leave.getByText('The end must be on or after the start.')).toBeVisible();
  await leave.getByLabel('End').fill(day(5));
  await expect(leave.getByText('The end must be on or after the start.')).toBeHidden();
  await leave.getByRole('button', { name: 'Add leave' }).click();
  await expect(leave).toBeHidden();
  await expect(cell(day(4))).toHaveAttribute('data-status', 'leave');
  await expect(cell(day(5))).toHaveAttribute('data-status', 'leave');
  await expect(cell(day(4)).getByText('Annual leave')).toBeVisible();

  // Tidy up through the UI so the next run starts from the same place.
  const leaveRow = page.locator('li', { hasText: format(parseISO(day(5)), 'd MMM yyyy') }).first();
  await leaveRow.getByRole('button', { name: 'Remove Annual leave' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(cell(day(4))).toHaveAttribute('data-status', 'working');

  await page.getByRole('button', { name: `Delete ${name}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(name)).toHaveCount(0);
  await expect(cell(day(0)).getByText(label)).toHaveCount(0);
});

test('a shift can cover several days and come back every week', async ({ page, isMobile }) => {
  // Desktop and mobile run at once against one account, so each takes its own month.
  const monday = isMobile ? '2027-06-07' : '2027-05-03';
  const day = daysAfter(monday);
  const label = `Nights ${stamp}`;
  const cell = cellOn(page);

  await page.goto(`/work/calendar?month=${monday.slice(0, 7)}`);
  await expect(page.getByRole('heading', { name: 'Job calendar' }).first()).toBeVisible();

  // Monday to Wednesday nights, back every week for three weeks.
  await page.getByRole('button', { name: 'Add shift' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('First day').fill(day(0));
  // A last day before the first is called out at once and cannot be saved.
  await dialog.getByLabel('Last day').fill(day(-1));
  await expect(dialog.getByText('The last day must be on or after the first.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add shift' }).click();
  await expect(dialog.getByLabel('Last day')).toBeFocused();
  await dialog.getByLabel('Last day').fill(day(2));
  await expect(dialog.getByText('The last day must be on or after the first.')).toBeHidden();
  // Moving the first day carries the last day along, keeping the block three days long.
  await dialog.getByLabel('First day').fill(day(7));
  await expect(dialog.getByLabel('Last day')).toHaveValue(day(9));
  await dialog.getByLabel('First day').fill(day(0));
  await expect(dialog.getByLabel('Last day')).toHaveValue(day(2));
  await dialog.getByLabel('Label').fill(label);
  await dialog.getByLabel('Start').fill('20:00');
  await dialog.getByLabel('End').fill('06:00');
  await dialog.getByLabel('Repeats').selectOption('week');
  await expect(dialog.getByLabel('Every')).toHaveValue('1');
  await dialog.getByLabel('Repeat until').fill(day(17));
  await dialog.getByRole('button', { name: 'Add shift' }).click();
  await expect(dialog).toBeHidden();

  // Other tests may leave a pattern running, so the shift is checked by its label.
  for (const offset of [0, 1, 2, 7, 9, 14, 16]) {
    await expect(cell(day(offset))).toHaveAttribute('data-status', 'working');
    await expect(cell(day(offset)).getByText(label)).toBeVisible();
  }
  await expect(cell(day(3)).getByText(label)).toHaveCount(0);
  await expect(cell(day(21)).getByText(label)).toHaveCount(0); // past the end date

  // Listed once, with its reach spelled out.
  const until = format(parseISO(day(17)), 'd MMM');
  const row = page
    .locator('li', { hasText: label })
    .filter({ hasText: `3 days · every week · until ${until}` });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: `Remove ${label}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(cell(day(0)).getByText(label)).toHaveCount(0);
  await expect(cell(day(14)).getByText(label)).toHaveCount(0);
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
