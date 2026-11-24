import { expect, test } from './test';

const stamp = Date.now().toString(36);

/**
 * One long title must not widen a page: implicit grid columns used to grow
 * to the widest single-line row, and iOS Safari then zoomed the page out.
 */
test('a long task title does not widen the dashboard, tasks or finance pages', async ({ page }) => {
  const title = `Go to the records centre to collect every email about the skills audit ${stamp}`;
  await page.goto('/dashboard');
  const capture = page.getByPlaceholder(/quick capture/i);
  await capture.fill(title);
  await capture.press('Enter');
  await expect(page.getByText(title).first()).toBeVisible();

  for (const route of ['/dashboard', '/tasks', '/finance']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle').catch(() => {});
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      beyond: [...document.querySelectorAll('main *')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > window.innerWidth + 1;
      }).length,
    }));
    expect(widths.scroll, `${route} scroll width`).toBeLessThanOrEqual(widths.client);
    expect(widths.beyond, `${route} elements past the right edge`).toBe(0);
  }
});

test('a long habit name and plan item do not widen the habits pages', async ({ page }) => {
  const name = `Work through the whole intermediate grammar workbook before the exam ${stamp}`;
  await page.goto('/habits');
  await page
    .getByRole('button', { name: /new habit/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'New habit' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('button', { name: 'Create habit' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('link', { name, exact: true }).first().click();
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await page
    .getByLabel('What to do next')
    .fill(`Read the unit on participles twice and copy out every example sentence ${stamp}`);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('[data-slot=habit-plan] li')).toHaveCount(1);

  for (const route of [page.url(), '/habits', '/dashboard']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle').catch(() => {});
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      beyond: [...document.querySelectorAll('main *')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > window.innerWidth + 1;
      }).length,
    }));
    expect(widths.scroll, `${route} scroll width`).toBeLessThanOrEqual(widths.client);
    expect(widths.beyond, `${route} elements past the right edge`).toBe(0);
  }
});
