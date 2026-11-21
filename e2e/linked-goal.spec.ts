import { expect, test } from './test';

const stamp = Date.now().toString(36);

/** A task filed under a project inherits the goal that project supports (instructions.md 5.3). */
test('choosing a project fills in the goal it supports, and the user can still override it', async ({
  page,
}) => {
  const goalTitle = `Run a half marathon ${stamp}`;
  const projectTitle = `Spring training plan ${stamp}`;

  await page.goto('/tasks?new=1');
  const sheet = page.getByRole('dialog', { name: 'New task' });
  await sheet.getByLabel('Title').fill(`Buy running shoes ${stamp}`);

  await sheet.getByRole('button', { name: 'New goal' }).click();
  const goalDialog = page.getByRole('dialog', { name: 'New goal' });
  await goalDialog.getByLabel('Title').fill(goalTitle);
  await goalDialog.getByRole('button', { name: 'Create goal' }).click();
  await expect(goalDialog).toBeHidden();
  // Creating a goal from the sheet selects it; put it back to None to test the inheritance.
  await sheet.locator('#task-goal').selectOption('');

  await sheet.getByRole('button', { name: 'New project' }).click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByLabel('Title').fill(projectTitle);
  await projectDialog.getByRole('checkbox', { name: goalTitle }).click();
  await projectDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(projectDialog).toBeHidden();

  await expect(sheet.locator('#task-project option:checked')).toHaveText(projectTitle);
  await expect(sheet.locator('#task-goal option:checked')).toContainText(goalTitle);
  await expect(sheet.getByText('Follows the project.')).toBeVisible();

  await sheet.getByRole('button', { name: 'Add task' }).click();
  await expect(sheet).toBeHidden();

  // A second task that only picks the project is saved under the goal too.
  const second = `Book the physio ${stamp}`;
  await page.goto('/tasks?new=1');
  await sheet.getByLabel('Title').fill(second);
  await sheet.locator('#task-project').selectOption({ label: projectTitle });
  await expect(sheet.locator('#task-goal option:checked')).toContainText(goalTitle);
  await sheet.getByRole('button', { name: 'Add task' }).click();
  await expect(sheet).toBeHidden();

  await page.goto(`/tasks?goal=`);
  await page.getByRole('link', { name: second, exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  await expect(edit.locator('#task-goal option:checked')).toContainText(goalTitle);
  await expect(edit.getByText('Follows the project.')).toBeHidden();
});
