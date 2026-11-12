import { expect, test } from './test';

const stamp = Date.now().toString(36);

test('create a task from the sheet and complete it', async ({ page }) => {
  const title = `Walk the dog ${stamp}`;
  await page.goto('/tasks?new=1');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Life Segment').first().selectOption({ label: 'Faith' });
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByRole('checkbox', { name: `Complete ${title}` }).click();
  await expect(page.getByRole('checkbox', { name: `Complete ${title}` })).toBeHidden();
  await page.goto('/tasks?done=1');
  await expect(page.getByRole('checkbox', { name: `Reopen ${title}` })).toBeVisible();
});

test('create a segment, project and goal without leaving the task sheet', async ({ page }) => {
  const segmentName = `Garden ${stamp}`;
  const projectTitle = `Raised beds ${stamp}`;
  const goalTitle = `Grow our own veg ${stamp}`;
  const taskTitle = `Order seeds ${stamp}`;
  await page.goto('/tasks?new=1');
  const sheet = page.getByRole('dialog', { name: 'New task' });
  await sheet.getByLabel('Title').fill(taskTitle);

  await sheet.getByRole('button', { name: 'New segment' }).click();
  const segmentDialog = page.getByRole('dialog', { name: 'New Life Segment' });
  await segmentDialog.getByLabel('Name').fill(segmentName);
  await segmentDialog.getByRole('button', { name: 'Create segment' }).click();
  await expect(segmentDialog).toBeHidden();
  await expect(sheet.locator('#task-segment option:checked')).toHaveText(segmentName);

  await sheet.getByRole('button', { name: 'New project' }).click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByLabel('Title').fill(projectTitle);
  await expect(projectDialog.getByLabel('Life Segment')).toContainText(segmentName);
  await projectDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(projectDialog).toBeHidden();
  await expect(sheet.locator('#task-project option:checked')).toHaveText(projectTitle);

  await sheet.getByRole('button', { name: 'New goal' }).click();
  const goalDialog = page.getByRole('dialog', { name: 'New goal' });
  await goalDialog.getByLabel('Title').fill(goalTitle);
  await goalDialog.getByRole('button', { name: 'Create goal' }).click();
  await expect(goalDialog).toBeHidden();
  await expect(sheet.locator('#task-goal option:checked')).toContainText(goalTitle);

  // The task form kept its title through all three nested dialogs.
  await expect(sheet.getByLabel('Title')).toHaveValue(taskTitle);
  await sheet.getByRole('button', { name: 'Add task' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await page.goto('/projects');
  await expect(page.getByText(projectTitle)).toBeVisible();
});

test('quick capture lands in the Inbox and files as a task', async ({ page }) => {
  const text = `Buy stamps ${stamp}`;
  await page.goto('/dashboard');
  const input = page.getByLabel('Quick capture');
  await input.fill(text);
  await input.press('Enter');
  const item = page.locator('li', { hasText: text }).first();
  await expect(item).toBeVisible();

  await item.getByRole('button', { name: /file/i }).click();
  await item.getByLabel('Life Segment').selectOption({ label: 'Finance' });
  await item.getByRole('button', { name: /file/i }).last().click();
  await expect(page.locator('li', { hasText: text })).toHaveCount(0);

  await page.goto('/tasks?segment=finance');
  await expect(page.getByText(text)).toBeVisible();
});

test('create a goal from the dialog', async ({ page }) => {
  const title = `Read twelve books ${stamp}`;
  await page.goto('/goals');
  await page
    .getByRole('button', { name: /new goal|add goal|create goal/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByText(title)).toBeVisible();
});

test('import the legacy JSON export', async ({ page }) => {
  await page.goto('/settings/data');
  await page
    .getByLabel('JSON export from the old planner')
    .setInputFiles(
      process.env.LEGACY_EXPORT_FILE ?? 'src/features/import/__fixtures__/legacy-sample.json'
    );
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const table = page.getByRole('table');
  await expect(table).toBeVisible({ timeout: 30_000 });
  const tasksRow = table.locator('tr', {
    has: page.getByRole('cell', { name: 'Tasks', exact: true }),
  });
  await expect(tasksRow).toBeVisible();
  // second run is idempotent: nothing new is imported for tasks
  await page.goto('/tasks');
  await expect(page.getByText(/Submit Tax Return/i).first()).toBeVisible();
});
