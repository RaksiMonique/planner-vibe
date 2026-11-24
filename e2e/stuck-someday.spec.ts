import { addDays, format } from 'date-fns';
import { expect, test } from './test';

const stamp = Date.now().toString(36);

/**
 * A task that keeps rolling over offers "Write it out" in its sheet: the
 * answers go to the journal as a reflection about the task, and the smallest
 * next step becomes a subtask (tasks/stuck.ts).
 */
test('a stuck task can be written out into the journal and a next step', async ({
  page,
  isMobile,
}) => {
  test.slow();
  const title = `Call the dentist ${stamp}${isMobile ? ' (phone)' : ''}`;
  const nextStep = `Find the number ${stamp}`;
  const fiveDaysAgo = format(addDays(new Date(), -5), 'yyyy-MM-dd');

  await page.goto('/tasks?new=1');
  const sheet = page.getByRole('dialog', { name: 'New task' });
  await sheet.getByLabel('Title').fill(title);
  await sheet.getByLabel('Due date').fill(fiveDaysAgo);
  await sheet.getByRole('button', { name: 'Add task' }).click();
  // Saving re-renders the whole task list, which stalls under parallel load.
  await expect(sheet).toBeHidden({ timeout: 30_000 });

  // Overdue by five days: the row says so quietly, and the sheet offers to write it out.
  const row = page
    .locator('li')
    .filter({ has: page.getByRole('link', { name: title, exact: true }) })
    .first();
  await expect(row).toContainText('Stuck?');
  await page.getByRole('link', { name: title, exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  const stuck = edit.locator('[data-slot=sheet-stuck]');
  await expect(stuck).toContainText('Stuck on this?');
  await stuck.getByRole('button', { name: 'Write it out' }).click();
  await stuck.getByLabel('What am I avoiding?').fill(`Being told off about flossing ${stamp}`);
  await stuck.getByLabel('What is the smallest next step?').fill(nextStep);
  await stuck.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(stuck).toContainText('Saved to your journal. The next step is a subtask now.');
  await expect(edit.locator('[data-slot=sheet-subtasks]')).toContainText(nextStep);

  // The journal has the reflection, pointing back at the task.
  await page.goto('/journal');
  // The Recent list carries the link; the day's own card lists the entry without it.
  const recent = page
    .locator('li')
    .filter({ hasText: `Stuck on: ${title}` })
    .filter({ has: page.getByRole('link', { name: 'About a task' }) })
    .first();
  await expect(recent).toBeVisible();
  await recent.getByRole('link', { name: 'About a task' }).click();
  await expect(page).toHaveURL(/\/tasks\?task=/);
  await expect(page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Title')).toHaveValue(
    title
  );
});

/**
 * A goal left planned with no date joins the someday pile; the dashboard asks
 * about one of them each week (goals/someday.ts).
 */
test('a planned goal with no date shows up on the Someday card', async ({ page, isMobile }) => {
  test.slow();
  const title = `Learn the cello ${stamp}${isMobile ? ' (phone)' : ''}`;

  await page.goto('/goals');
  await page.getByRole('button', { name: 'New goal' }).click();
  const dialog = page.getByRole('dialog', { name: 'New goal' });
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Status').click();
  await page.getByRole('option', { name: 'Planned' }).click();
  await dialog.getByRole('button', { name: 'Create goal' }).click();
  await expect(dialog).toBeHidden();
  // The goals page is large; its refresh after saving stalls under parallel load.
  await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 });

  await page.goto('/dashboard');
  const main = page.getByRole('main');
  const heading = main.getByRole('heading', { name: 'Someday' });
  if (!(await heading.isVisible())) {
    // A stored layout may have hidden the card; add it back and return.
    await page.goto('/dashboard?customise=1');
    await main.getByRole('button', { name: 'Someday', exact: true }).click();
    await page.goto('/dashboard');
  }
  await expect(heading).toBeVisible();
  const card = main.locator('[data-slot=someday-pick]');
  await expect(card).toContainText('You said someday. Still want it?');
  // The week's pick is one of the pile, which other runs add to as well.
  const picked = card.getByRole('link').first();
  await expect(picked).toHaveAttribute('href', /\/(goals|projects)\/[0-9a-f-]+$/);
  await expect(picked).not.toBeEmpty();
  await expect(card.getByRole('button', { name: 'Start it' })).toBeVisible();
});
