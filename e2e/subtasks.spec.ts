import { expect, test } from './test';

const stamp = Date.now().toString(36);

/** A new task can carry subtasks typed one per line (instructions.md 5.4). */
test('a new task is created with its subtasks and they show under it', async ({ page }) => {
  const title = `Plan the reunion ${stamp}`;
  await page.goto('/tasks?new=1');
  const sheet = page.getByRole('dialog', { name: 'New task' });
  await sheet.getByLabel('Title').fill(title);
  await sheet.getByLabel('Subtasks').fill(`Book the hall ${stamp}\n\nSend invitations ${stamp}\n`);
  await sheet.getByRole('button', { name: 'Add task' }).click();
  await expect(sheet).toBeHidden();

  const parentRow = page
    .locator('li')
    .filter({ has: page.getByRole('link', { name: title, exact: true }) })
    .first();
  await expect(parentRow.locator('[data-slot="subtasks"]')).toContainText(`Book the hall ${stamp}`);
  await expect(parentRow.locator('[data-slot="subtasks"]')).toContainText(
    `Send invitations ${stamp}`
  );

  // Opening the parent lists both; a subtask's own sheet offers no subtask box.
  await page.getByRole('link', { name: title, exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  await expect(edit.locator('[data-slot=sheet-subtasks]')).toContainText(`Book the hall ${stamp}`);
  await expect(edit.getByLabel('Add subtasks')).toBeVisible();
  await edit
    .locator('[data-slot=sheet-subtasks]')
    .getByRole('link', { name: 'Open' })
    .first()
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Add subtasks')
  ).toHaveCount(0);
});

test('saving a subtask from the sheet returns to the parent task', async ({ page }) => {
  const title = `Pack for the trip ${stamp}`;
  await page.goto('/tasks?new=1');
  const sheet = page.getByRole('dialog', { name: 'New task' });
  await sheet.getByLabel('Title').fill(title);
  await sheet.getByRole('button', { name: 'Add task' }).click();
  await expect(sheet).toBeHidden();

  await page.getByRole('link', { name: title, exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  await expect(edit.getByLabel('Title')).toHaveValue(title);
  await edit.getByRole('link', { name: 'Add subtask' }).click();
  const child = page.getByRole('dialog', { name: 'New subtask' });
  await child.getByLabel('Title').fill(`Passport ${stamp}`);
  await child.getByRole('button', { name: 'Add task' }).click();
  await expect(child).toBeHidden();

  // Back on the parent, with the new subtask listed.
  await expect(edit).toBeVisible();
  await expect(edit.getByLabel('Title')).toHaveValue(title);
  await expect(edit.locator('[data-slot=sheet-subtasks]')).toContainText(`Passport ${stamp}`);
});
