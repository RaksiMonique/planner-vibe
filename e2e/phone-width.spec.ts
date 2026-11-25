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

test('a long quote with long tags does not widen the quotes page', async ({ page }) => {
  const tag = `the best way to never get anything done at all is to wait for the mood ${stamp}`;
  await page.goto('/notes/quotes');
  await page
    .getByRole('button', { name: /new quote/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'New quote' });
  await dialog
    .getByLabel('Quote', { exact: true })
    .fill(`Supercalifragilisticexpialidociousnessesandotherlongwordswithoutanyspaces ${stamp}`);
  await dialog.getByLabel('Why it matters to me').fill('Because long words happen.');
  await dialog.getByLabel('Tags').fill(tag);
  await dialog.getByRole('button', { name: 'Add quote' }).click();
  await expect(dialog).toBeHidden();

  for (const route of ['/notes/quotes', `/notes/quotes?tag=${encodeURIComponent(tag)}`]) {
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

test('a long vehicle name and document reference do not widen the vehicles page', async ({
  page,
}) => {
  const model = `Land Cruiser Prado VX Limited Edition Twin Turbo ${stamp}`;
  await page.goto('/vehicles');
  await page
    .getByRole('button', { name: /new vehicle/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'New vehicle' });
  await dialog.getByLabel('Make').fill('Toyota');
  await dialog.getByLabel('Model').fill(model);
  await dialog.getByLabel('Licence plate').fill('LONGPLATE 99999');
  await dialog.getByRole('button', { name: 'Add vehicle' }).click();
  await expect(dialog).toBeHidden();
  const label = `Toyota ${model}`;
  const card = page.locator('[data-slot="vehicle-card"]', { hasText: label });
  await card.getByRole('button', { name: `Add Insurance for ${label}` }).click();
  const insurance = page.getByRole('dialog', { name: `Insurance for ${label}` });
  await insurance.getByLabel('Expires on').fill('2030-01-31');
  await insurance
    .getByLabel('Reference')
    .fill('POLICYNUMBERWITHOUTANYSPACESATALL-0000000000-9999999999');
  await insurance.getByRole('button', { name: 'Save date' }).click();
  await expect(insurance).toBeHidden();

  await page.goto('/vehicles');
  await page.waitForLoadState('networkidle').catch(() => {});
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    beyond: [...document.querySelectorAll('main *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > window.innerWidth + 1;
    }).length,
  }));
  expect(widths.scroll, '/vehicles scroll width').toBeLessThanOrEqual(widths.client);
  expect(widths.beyond, '/vehicles elements past the right edge').toBe(0);
});
