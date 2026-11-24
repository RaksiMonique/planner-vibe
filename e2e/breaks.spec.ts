import { expect, test } from './test';

// The desktop and mobile projects run at the same moment against one user, so the
// clock alone can collide; the random tail keeps each worker's idea title unique.
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const STARTER_SHAPES = ['Energy day', 'Admin day', 'Six plus one'];

/**
 * A session's end offers a break instead of the scroll reflex: the time page
 * keeps a list of break ideas and rolls one at random. The templates panel
 * seeds three day shapes built around energy. Both starter buttons only show
 * while something is missing, so the test takes them when offered and checks
 * the outcome either way; the app-mobile project shares the same user.
 */
test('the time page rolls a break and seeds day shapes', async ({ page }) => {
  test.slow();
  await page.goto('/time');

  // Break ideas: take the starters when offered, then add one of our own.
  const ideasPanel = page.locator('[data-slot=break-ideas]');
  await expect(ideasPanel).toBeVisible();
  const starterIdeas = ideasPanel.getByRole('button', { name: 'Add starter ideas' });
  if (await starterIdeas.isVisible()) {
    await starterIdeas.click();
    await expect(ideasPanel.getByText('Stretch', { exact: true })).toBeVisible();
  }
  const mine = `Water the plants ${stamp}`;
  await ideasPanel.getByLabel('Break idea').fill(mine);
  await ideasPanel.getByLabel('Gets me moving').check();
  await ideasPanel.getByRole('button', { name: 'Add idea' }).click();
  await expect(ideasPanel.getByText(mine)).toBeVisible();

  // Rolling picks one of the listed titles.
  const picker = page.locator('[data-slot=break-picker]').first();
  await picker.getByRole('button', { name: 'Roll a break' }).click();
  const pick = picker.locator('[data-slot=break-pick]');
  await expect(pick).toBeVisible();
  const titles = await ideasPanel.locator('li').allInnerTexts();
  const picked = (await pick.innerText()).trim();
  expect(titles.some((t) => t.includes(picked))).toBe(true);
  await picker.getByRole('button', { name: 'Another' }).click();
  await expect(pick).toBeVisible();

  // Clean up the idea we added.
  await ideasPanel.getByRole('button', { name: `Delete ${mine}` }).click();
  await expect(ideasPanel.getByText(mine)).toBeHidden();

  // Day shapes: the button shows while any of the three is missing.
  const templates = page.locator('section').filter({ hasText: 'Templates' }).first();
  const starterShapes = templates.getByRole('button', { name: 'Starter day shapes' });
  if (await starterShapes.isVisible()) {
    await starterShapes.click();
    await expect(templates.getByRole('status')).toContainText(/Added \d day shapes?\./);
  }
  for (const name of STARTER_SHAPES) {
    await expect(templates.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(templates.getByRole('button', { name: 'Starter day shapes' })).toBeHidden();
});
