import { expect, test } from './test';

const stamp = Date.now().toString(36);

/**
 * A quote is kept with its source and why it matters; tags link it to other
 * notes; a book in the reading list collects what was taken from it; and a
 * capture can be filed straight as a quote (instructions.md 5.1, 7.6).
 */
test('a quote keeps its why, its tags and its book', async ({ page, isMobile }) => {
  test.slow();
  const book = `The Practice of the Presence of God ${stamp}`;
  const tag = `how to never finish anything ${stamp}`;
  const line = `Do everything for the love of God ${stamp}`;

  // A book in the reading list.
  await page.goto('/media/reading');
  await page
    .getByRole('main')
    .getByRole('button', { name: /add|new/i })
    .first()
    .click();
  await page.getByRole('dialog').getByLabel('Title').fill(book);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /create|save|add/i })
    .last()
    .click();
  await page.getByRole('link', { name: book, exact: true }).first().click();
  await expect(page).toHaveURL(/\/media\/[0-9a-f-]+$/);

  // A quote from its page: the book is preselected as the source.
  const section = page.locator('[data-slot=item-notes]');
  await section.getByRole('button', { name: 'Quote', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New quote' });
  await dialog.getByLabel('Quote', { exact: true }).fill(line);
  await dialog.getByLabel('Why it matters to me').fill(`Because I rush ${stamp}.`);
  await dialog.getByLabel('Tags').fill(`${tag}, Patience`);
  await expect(dialog.getByLabel('From the tracker')).toHaveValue(/[0-9a-f-]{36}/);
  await dialog.getByRole('button', { name: 'Add quote' }).click();
  await expect(dialog).toBeHidden();
  const card = section.locator('[data-slot=card]', { hasText: line });
  await expect(card).toContainText(`Because I rush ${stamp}.`);
  await expect(card).toContainText(book); // source filled from the book
  await expect(card).toContainText('patience');

  // The quotes page: the tag filters, the search finds the why.
  await page.goto('/notes/quotes');
  await page
    .locator('[data-slot=card]', { hasText: line })
    .getByRole('link', { name: tag })
    .click();
  await expect(page).toHaveURL(/tag=/);
  await expect(page.getByRole('navigation', { name: 'Tags' })).toContainText(tag);
  await expect(page.getByText(line)).toBeVisible();
  await page.getByRole('textbox', { name: 'Search' }).fill(`rush ${stamp}`);
  await page.getByRole('main').getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText(line)).toBeVisible();

  // A capture filed as a quote, with the why in the same step.
  const captured = `Begin again ${stamp}${isMobile ? ' (phone)' : ''}`;
  await page.goto('/dashboard');
  const input = page.getByLabel('Quick capture');
  await input.fill(captured);
  await input.press('Enter');
  const item = page.locator('li', { hasText: captured }).first();
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'File as task, note or quote' }).click();
  await item.getByLabel('Life Segment').selectOption({ index: 1 });
  await item.getByRole('button', { name: 'As quote' }).click();
  await item.getByLabel('Author').fill('Brother Lawrence');
  await item.getByLabel('Why it matters to me').fill(`Every morning ${stamp}`);
  await item.getByLabel('Tags').fill(tag);
  await item.getByRole('button', { name: 'Save quote' }).click();
  await expect(page.locator('li', { hasText: captured })).toHaveCount(0);

  await page.goto(`/notes/quotes?tag=${encodeURIComponent(tag)}`);
  await expect(page.getByText(captured)).toBeVisible();
  await expect(page.getByText(`Every morning ${stamp}`)).toBeVisible();
  await expect(page.getByText(line)).toBeVisible();
});
