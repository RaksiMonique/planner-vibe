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

test('pickers list the most used segments and projects first', async ({ page }) => {
  const quiet = { segment: `Attic ${stamp}`, project: `Boxes ${stamp}` };
  const busy = { segment: `Cellar ${stamp}`, project: `Wine ${stamp}` };

  async function addTask(title: string, create?: { segment: string; project: string }) {
    await page.goto('/tasks?new=1');
    const sheet = page.getByRole('dialog', { name: 'New task' });
    await sheet.getByLabel('Title').fill(title);
    if (create) {
      await sheet.getByRole('button', { name: 'New segment' }).click();
      const segmentDialog = page.getByRole('dialog', { name: 'New Life Segment' });
      await segmentDialog.getByLabel('Name').fill(create.segment);
      await segmentDialog.getByRole('button', { name: 'Create segment' }).click();
      await expect(segmentDialog).toBeHidden();
      await sheet.getByRole('button', { name: 'New project' }).click();
      const projectDialog = page.getByRole('dialog', { name: 'New project' });
      await projectDialog.getByLabel('Title').fill(create.project);
      await projectDialog.getByRole('button', { name: 'Create project' }).click();
      await expect(projectDialog).toBeHidden();
    } else {
      await sheet.locator('#task-segment').selectOption({ label: busy.segment });
      await sheet.locator('#task-project').selectOption({ label: busy.project });
    }
    await sheet.getByRole('button', { name: 'Add task' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText(title)).toBeVisible();
  }

  // One task in the quiet pair, two in the busy pair.
  await addTask(`Label the boxes ${stamp}`, quiet);
  await addTask(`Rack the bottles ${stamp}`, busy);
  await addTask(`Check the corks ${stamp}`);

  await page.goto('/tasks?new=1');
  const sheet = page.getByRole('dialog', { name: 'New task' });
  // The sheet mounts through a portal after hydration, so wait for its pickers.
  await expect(sheet.locator('#task-segment')).toBeVisible();
  const segments = await sheet.locator('#task-segment option').allTextContents();
  expect(segments.indexOf(busy.segment)).toBeGreaterThan(-1);
  expect(segments.indexOf(busy.segment)).toBeLessThan(segments.indexOf(quiet.segment));
  const projects = await sheet.locator('#task-project option').allTextContents();
  expect(projects.indexOf(busy.project)).toBeGreaterThan(-1);
  expect(projects.indexOf(busy.project)).toBeLessThan(projects.indexOf(quiet.project));
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

test('a goal page starts a linked project, and a project page a linked goal', async ({ page }) => {
  const goalTitle = `Run a half marathon ${stamp}`;
  const projectTitle = `Training plan ${stamp}`;
  const secondGoal = `Run a full marathon ${stamp}`;
  await page.goto('/goals');
  await page
    .getByRole('button', { name: /new goal/i })
    .first()
    .click();
  await page.getByLabel('Title').fill(goalTitle);
  await page.getByRole('button', { name: 'Create goal' }).click();
  await page.getByRole('link', { name: goalTitle }).first().click();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);

  // New project from the goal page: created already linked to this goal.
  await page.getByRole('button', { name: 'New project' }).click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByLabel('Title').fill(projectTitle);
  await expect(projectDialog.getByRole('checkbox', { name: goalTitle })).toBeChecked();
  await projectDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(projectDialog).toBeHidden();
  const projectLink = page.getByRole('link', { name: projectTitle });
  await expect(projectLink).toBeVisible();

  // New goal from the project page: linked to the project once saved.
  await projectLink.click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
  await expect(page.getByRole('link', { name: goalTitle })).toBeVisible();
  await page.getByRole('button', { name: 'New goal' }).click();
  const goalDialog = page.getByRole('dialog', { name: 'New goal' });
  await goalDialog.getByLabel('Title').fill(secondGoal);
  await goalDialog.getByRole('button', { name: 'Create goal' }).click();
  await expect(goalDialog).toBeHidden();
  await expect(page.getByRole('link', { name: secondGoal })).toBeVisible();
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
