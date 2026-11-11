import { expect, test } from './test';

test('the dashboard follows the card order and hidden cards chosen in Settings', async ({
  page,
}) => {
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
  expect(await indexOf('Inbox')).toBeGreaterThan(0);
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
