import { randomUUID } from 'node:crypto';
import { expect, test } from './test';

const stamp = Date.now().toString(36);

test('a planner export from another project imports once, and a second run adds nothing', async ({
  page,
}) => {
  const seg = randomUUID();
  const goal = randomUUID();
  const parent = randomUUID();
  const child = randomUUID();
  const data = {
    format: 'planner-v2',
    exportedAt: new Date().toISOString(),
    profile: { id: randomUUID() },
    lifeSegments: [
      { id: seg, name: `Imported segment ${stamp}`, slug: `imported-${stamp}`, accent: 'sage' },
    ],
    goals: [{ id: goal, lifeSegmentId: seg, horizon: 'annual', title: `Imported goal ${stamp}` }],
    tasks: [
      { id: parent, lifeSegmentId: seg, goalId: goal, title: `Imported task ${stamp}` },
      { id: child, lifeSegmentId: seg, parentTaskId: parent, title: `Imported subtask ${stamp}` },
    ],
  };
  const upload = {
    name: 'planner-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  };

  const runImport = async () => {
    await page.goto('/settings/data');
    await page.getByLabel('Planner export (JSON)').setInputFiles(upload);
    await page.getByRole('button', { name: 'Import planner export' }).click();
    const table = page.getByRole('table').filter({ hasText: 'tasks' }).last();
    await expect(table).toBeVisible({ timeout: 30_000 });
    return table.locator('tr', { hasText: 'tasks' }).getByRole('cell');
  };

  const first = await runImport();
  await expect(first.nth(1)).toHaveText('2');
  await expect(first.nth(2)).toHaveText('0');

  await page.goto('/tasks');
  await expect(page.getByText(`Imported task ${stamp}`).first()).toBeVisible();

  const second = await runImport();
  await expect(second.nth(1)).toHaveText('0');
  await expect(second.nth(2)).toHaveText('2');
});
