import { expect, test } from './test';

const stamp = Date.now().toString(36);

/**
 * A habit linked to a course carries how it goes and a plan of what to do
 * next; the next item shows wherever the habit is checked in, and ticking an
 * item off records the day's check-in (instructions.md 8.2).
 */
test('a study habit linked to a course says what to do next', async ({ page }) => {
  test.slow();
  const course = `Greek grammar ${stamp}`;
  const habit = `Study Greek ${stamp}`;

  // A course with one lesson.
  await page.goto('/study');
  await page
    .getByRole('button', { name: /new course/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(course);
  await page.getByRole('button', { name: 'Create course' }).click();
  await page.getByRole('link', { name: course, exact: true }).first().click();
  await expect(page).toHaveURL(/\/study\/courses\//);
  await page.getByLabel('Lesson title').fill(`Alphabet ${stamp}`);
  await page.getByRole('button', { name: 'Add lesson' }).click();
  await expect(page.getByText(`1. Alphabet ${stamp}`)).toBeVisible();

  // A habit for it, from the course page: the link is preselected.
  const habitsSection = page.locator('[data-slot=linked-habits]');
  await habitsSection.getByRole('button', { name: 'Habit' }).click();
  const dialog = page.getByRole('dialog', { name: 'New habit' });
  await dialog.getByLabel('Name').fill(habit);
  await expect(dialog.getByLabel('Linked to')).toHaveValue(/^course:/);
  await dialog
    .getByLabel('How it goes')
    .fill('Open the textbook, do the next lesson, write five words.');
  await dialog.getByRole('button', { name: 'Create habit' }).click();
  await expect(dialog).toBeHidden();
  const row = habitsSection.locator('li').filter({ hasText: habit });
  await expect(row).toContainText(`Next lesson: Alphabet ${stamp}`);

  // Its own page: the link, the details and a plan.
  await row.getByRole('link', { name: habit }).click();
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await expect(page.getByRole('link', { name: course })).toBeVisible();
  await expect(page.locator('[data-slot=habit-details]')).toContainText('Open the textbook');
  await expect(page.locator('[data-slot=next-up]')).toContainText(`Next lesson: Alphabet ${stamp}`);

  await page.getByLabel('What to do next').fill(`Read chapter 1 ${stamp}`);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('[data-slot=next-up]')).toContainText(`Read chapter 1 ${stamp}`);
  await page.getByLabel('What to do next').fill(`Read chapter 2 ${stamp}`);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('[data-slot=habit-plan] li')).toHaveCount(2);

  // The habits page answers "what now?" beside the check-in.
  await page.goto('/habits');
  const today = page.locator('li').filter({ hasText: habit }).first();
  await expect(today).toContainText(`Next: Read chapter 1 ${stamp}`);

  // Ticking the item off moves the queue on and checks the habit in for today.
  await today.getByRole('link', { name: `Next: Read chapter 1 ${stamp}` }).click();
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await page.getByRole('checkbox', { name: `Done: Read chapter 1 ${stamp}` }).click();
  await expect(page.locator('[data-slot=next-up]')).toContainText(`Read chapter 2 ${stamp}`);
  await expect(
    page.getByRole('checkbox', { name: `Remove today's check-in for ${habit}` })
  ).toBeVisible();

  // The course page shows the same.
  await page.getByRole('link', { name: course }).click();
  await expect(page).toHaveURL(/\/study\/courses\//);
  await expect(habitsSection.locator('li').filter({ hasText: habit })).toContainText(
    `Next: Read chapter 2 ${stamp}`
  );
});
