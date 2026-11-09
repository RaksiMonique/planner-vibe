import { expect, test } from '@playwright/test';

const stamp = Date.now().toString(36);

test('mood and energy check-in persists', async ({ page }) => {
  await page.goto('/wellness/mood');
  await page
    .getByRole('radio', { name: /^Mood 3/ })
    .first()
    .click();
  await page
    .getByRole('radio', { name: /^Energy 4/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: /check-in/i })
    .first()
    .click();
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(page.getByRole('radio', { name: /^Mood 3/ }).first()).toHaveAttribute(
    'aria-checked',
    'true'
  );
});

test('create a recipe, generate a grocery list and add an item', async ({ page }) => {
  const title = `Ackee and saltfish ${stamp}`;
  await page.goto('/meals/recipes');
  await page
    .getByRole('button', { name: /new recipe|add recipe/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create recipe' }).click();
  await expect(page.getByText(title).filter({ visible: true }).first()).toBeVisible();

  await page.goto('/meals');
  await page
    .getByRole('button', { name: /^Dinner on / })
    .first()
    .click();
  const meal = page.getByRole('dialog');
  await meal.getByLabel('Recipe').selectOption({ label: title });
  await meal.getByRole('button', { name: /add meal|save meal/i }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(`^Dinner on .*${title}`) }).first()
  ).toBeVisible();
  await page.getByRole('button', { name: /generate grocery list/i }).click();
  await expect(page).toHaveURL(/\/groceries\/[0-9a-f-]+/);
  const item = page.getByLabel('Item');
  await item.fill(`Bananas ${stamp}`);
  await item.press('Enter');
  await expect(page.getByText(`Bananas ${stamp}`).first()).toBeVisible();
});

test('create a vision board and upload an image to it', async ({ page }) => {
  const name = `Spring kitchen ${stamp}`;
  await page.goto('/vision-boards');
  await page
    .getByRole('button', { name: /new board/i })
    .first()
    .click();
  await page.getByLabel('Name').fill(name);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /create|save/i })
    .last()
    .click();
  await expect(page.getByText(name).filter({ visible: true }).first()).toBeVisible();

  await page
    .getByRole('link', { name: new RegExp(name) })
    .first()
    .click();
  await expect(page).toHaveURL(/\/vision-boards\/[0-9a-f-]+/);
  await page
    .getByRole('button', { name: /add item/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="image"]').setInputFiles('e2e/fixtures/tiny.png');
  await dialog.getByLabel('Caption').fill('Morning light');
  await dialog.getByRole('button', { name: 'Add to board' }).click();
  await expect(page.getByText('Morning light').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('main img').first()).toBeVisible();
});

test('add a gift recipient and an important record', async ({ page }) => {
  const person = `Aunt May ${stamp}`;
  await page.goto('/gifts');
  await page
    .getByRole('button', { name: /add (a )?(person|recipient)|new recipient/i })
    .first()
    .click();
  await page.getByLabel('Name').fill(person);
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page.getByText(person).filter({ visible: true }).first()).toBeVisible();

  const title = `Dr Lee ${stamp}`;
  await page.goto('/important');
  await page
    .getByRole('button', { name: /add an emergency contact|add record|new record/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Phone').fill('876-555-0100');
  await page.getByRole('button', { name: 'Add record' }).click();
  await expect(page.getByText(title).filter({ visible: true }).first()).toBeVisible();
});
