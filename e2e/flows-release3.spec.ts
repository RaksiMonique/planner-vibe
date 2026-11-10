import { expect, test } from './test';

const stamp = Date.now().toString(36);

test('create a Bible study and save a passage', async ({ page }) => {
  const title = `Gospel of Mark ${stamp}`;
  await page.goto('/bible');
  await page
    .getByRole('button', { name: /new study/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.getByText(title).first()).toBeVisible();

  const passage = page.getByLabel('Save a passage');
  await passage.fill('Phil 4:6-7');
  await passage.press('Enter');
  await expect(page.getByText(/Phil(ippians)? 4:6-7/).first()).toBeVisible();
});

test("write today's journal entry and a gratitude line", async ({ page }) => {
  const text = `Quiet morning, good coffee ${stamp}`;
  await page.goto('/journal');
  // Playwright's fill prepends in this auto-sizing textarea, so clear it first.
  await page.getByLabel('Today').clear();
  await page.getByLabel('Today').fill(text);
  await page.getByRole('button', { name: /save entry|save changes/i }).click();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Today')).toHaveValue(new RegExp(text));

  const grateful = page.getByLabel('Gratitude 1');
  await grateful.fill(`Sunlight ${stamp}`);
  await grateful.press('Enter');
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Gratitude 1')).toHaveValue(new RegExp(`Sunlight ${stamp}`));
});

test('the dashboard shows one of my saved quotes', async ({ page }) => {
  const quote = `Act, and God will act ${stamp}`;
  await page.goto('/notes/quotes');
  await page
    .getByRole('button', { name: /new quote|add quote/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('textarea').first().fill(quote);
  await dialog.getByLabel('Author').fill('St Joan of Arc');
  await dialog
    .getByRole('button', { name: /create|save|add/i })
    .last()
    .click();
  await expect(page.getByText(quote).first()).toBeVisible();

  // Own quotes rotate by day, so the card shows one of them, not necessarily the newest.
  await page.goto('/dashboard');
  const shown = page.getByRole('figure', { name: 'Quote of the day' }).locator('blockquote');
  await expect(shown).not.toBeEmpty();
  const text = (await shown.innerText()).trim();
  await page.goto('/notes/quotes');
  await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
});

test('create a course and a book on the reading list', async ({ page }) => {
  const course = `TypeScript foundations ${stamp}`;
  await page.goto('/study');
  await page
    .getByRole('button', { name: /new course/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(course);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /create|save|add/i })
    .last()
    .click();
  await expect(page.getByText(course).filter({ visible: true }).first()).toBeVisible();

  const book = `Interior Castle ${stamp}`;
  await page.goto('/media/reading');
  await page
    .getByRole('button', { name: /add|new/i })
    .first()
    .click();
  await page.getByRole('dialog').getByLabel('Title').fill(book);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /create|save|add/i })
    .last()
    .click();
  await expect(page.getByText(book).filter({ visible: true }).first()).toBeVisible();
});

test('import the deferred legacy sections', async ({ page }) => {
  await page.goto('/settings/data');
  await page.getByRole('button', { name: /import the rest|deferred/i }).click();
  await expect(page.getByRole('table').last()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('table').last()).toContainText(/bible/i);
});
