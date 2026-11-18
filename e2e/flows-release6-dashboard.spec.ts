import { expect, test } from './test';

// Two tests edit the one dashboard layout the test user has, so this file runs in order.
test.describe.configure({ mode: 'default' });

test('the dashboard follows the card order and hidden cards chosen in Settings', async ({
  page,
  isMobile,
}) => {
  // The layout is one preference per user, and both devices share the user.
  test.skip(isMobile, 'Desktop covers it; a parallel mobile run would undo its steps.');
  const main = page.getByRole('main');
  const layoutRows = page
    .getByRole('list')
    .filter({ has: page.getByRole('button', { name: /^Move .* up$/ }) })
    .locator('li');
  const indexOf = async (label: string) =>
    (await layoutRows.allInnerTexts()).findIndex((t) => t.trim().startsWith(label));

  // Start from the default layout whatever an earlier run left behind.
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Reset to default' }).click();
  await expect(page.getByRole('button', { name: 'Hide Life Segments' })).toBeVisible();

  await page.getByRole('button', { name: 'Hide Life Segments' }).click();
  await expect(page.getByRole('button', { name: 'Show Life Segments' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(main.getByRole('heading', { name: 'Life Segments' })).toHaveCount(0);

  await page.goto('/settings');
  await expect.poll(() => indexOf('Inbox')).toBeGreaterThan(0);
  for (let guard = 0; guard < 20; guard++) {
    const before = await indexOf('Inbox');
    if (before <= 0) break;
    await page.getByRole('button', { name: 'Move Inbox up' }).click();
    await expect.poll(() => indexOf('Inbox')).toBeLessThan(before);
    // Let the refresh that follows the action land before the next click.
    await page.waitForLoadState('networkidle');
  }
  expect(await indexOf('Inbox')).toBe(0);
  await page.goto('/dashboard');
  await expect(main.getByRole('heading', { level: 2 }).nth(1)).toHaveText(/inbox/i);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Reset to default' }).click();
  await expect(page.getByRole('button', { name: 'Hide Life Segments' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(main.getByRole('heading', { name: 'Life Segments' })).toBeVisible();
});

test('the day opens with the mood check-in, which saves in place', async ({ page }) => {
  await page.goto('/dashboard');
  const checkIn = page.locator('[data-slot="mood-check-in"]');
  await expect(checkIn).toBeVisible();
  // Another run (or the wellness page) may already have saved today; both end in the summary.
  const moodFour = checkIn.getByRole('radio', { name: /^Mood 4/ });
  if (await moodFour.isVisible()) {
    await moodFour.click();
    await checkIn.getByRole('radio', { name: /^Energy 3/ }).click();
  }
  await expect(checkIn).toContainText(/Mood \d · .*, energy \d/);
  await expect(checkIn.getByRole('link', { name: 'Change' })).toBeVisible();
});

test('Customise on the dashboard moves, hides and re-adds cards in place', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop covers it; a parallel mobile run would undo its steps.');
  const main = page.getByRole('main');

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Customise' }).click();
  await expect(page).toHaveURL(/customise=1/);
  await expect(main.getByText('Add a card')).toBeVisible();
  // Start from the default layout whatever an earlier run left behind.
  await main.getByRole('button', { name: 'Reset to default' }).click();
  await page.waitForLoadState('networkidle');
  await expect(main.getByText('Every card is on the page.')).toBeVisible();
  await expect(main.getByRole('button', { name: 'Move Weekly schedule up' })).toBeDisabled();

  await main.getByRole('button', { name: 'Hide Quote of the day' }).click();
  await expect(main.getByRole('button', { name: 'Quote of the day', exact: true })).toBeVisible();
  await expect(main.getByRole('button', { name: 'Hide Quote of the day' })).toHaveCount(0);
  await expect(page).toHaveURL(/customise=1/);

  // Weekly schedule is first; moving it down swaps it with the next shown card.
  await expect(main.getByRole('button', { name: 'Move Weekly schedule up' })).toBeDisabled();
  await main.getByRole('button', { name: 'Move Weekly schedule down' }).click();
  await expect(main.getByRole('button', { name: 'Move Weekly schedule up' })).toBeEnabled();

  await main.getByRole('button', { name: 'Quote of the day', exact: true }).click();
  await expect(main.getByRole('button', { name: 'Hide Quote of the day' })).toBeVisible();

  await main.getByRole('button', { name: 'Reset to default' }).click();
  await expect(main.getByRole('button', { name: 'Move Weekly schedule up' })).toBeDisabled();
  await expect(main.getByText('Every card is on the page.')).toBeVisible();

  await page.getByRole('link', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(main.getByRole('button', { name: /^Hide / })).toHaveCount(0);
});
