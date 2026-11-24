import { expect, test } from './test';

const stamp = Date.now().toString(36);

/**
 * A habit can serve a goal and carry its own why. The goal page lists the
 * habit, the habit page links back to the goal, and the why shows on the
 * habit page and, while the habit is still finding its feet, beside it on
 * the Habits page (instructions.md 8.2).
 */
test('a habit for a goal carries its why', async ({ page }) => {
  test.slow();
  const goal = `Run a half marathon ${stamp}`;
  const habit = `Run three mornings ${stamp}`;
  const why = `Because I want to keep up with the kids ${stamp}`;

  // A goal, from the Goals page.
  await page.goto('/goals');
  await page.getByRole('button', { name: 'New goal' }).first().click();
  const goalDialog = page.getByRole('dialog', { name: 'New goal' });
  await goalDialog.getByLabel('Title').fill(goal);
  await goalDialog.getByRole('button', { name: 'Create goal' }).click();
  await expect(goalDialog).toBeHidden();
  await page.locator('a[href^="/goals/"]').filter({ hasText: goal }).first().click();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);
  const goalUrl = page.url();

  // A habit for it, from the goal page: the link is preselected.
  const habitsSection = page.locator('[data-slot=linked-habits]');
  await expect(habitsSection).toContainText('Habits for this goal');
  await habitsSection.getByRole('button', { name: 'Habit' }).click();
  const dialog = page.getByRole('dialog', { name: 'New habit' });
  await dialog.getByLabel('Name').fill(habit);
  await expect(dialog.getByLabel('Linked to')).toHaveValue(/^goal:/);
  await dialog.getByLabel('Why I do this').fill(why);
  await dialog.getByRole('button', { name: 'Create habit' }).click();
  await expect(dialog).toBeHidden();
  const row = habitsSection.locator('li').filter({ hasText: habit });
  await expect(row).toBeVisible();

  // Its own page: the why under the title, the goal under "Linked to".
  await row.getByRole('link', { name: habit }).click();
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await expect(page.locator('[data-slot=habit-why]')).toContainText(why);
  await expect(page.locator('[data-slot=habit-rates]')).toContainText('of the last 30 days');
  const linked = page.getByRole('link', { name: goal });
  await expect(linked).toBeVisible();

  // A new habit has no record yet, so the Habits page shows the why beside it.
  await page.goto('/habits');
  const today = page.locator('li').filter({ hasText: habit }).first();
  await expect(today.locator('[data-slot=slipped-why]')).toContainText(why);

  // Back on the goal page, the habit is listed.
  await page.goto(goalUrl);
  await expect(habitsSection.locator('li').filter({ hasText: habit })).toBeVisible();
});
