import { expect, test } from './test';

const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return keyOf(d);
};

test('a vehicle tracks the expiry of its papers', async ({ page }) => {
  test.slow();
  const model = `Aqua ${stamp}`;
  const label = `2019 Toyota ${model}`;

  await page.goto('/vehicles');
  await page
    .getByRole('button', { name: /new vehicle/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'New vehicle' });
  await dialog.getByLabel('Make').fill('Toyota');
  await dialog.getByLabel('Model').fill(model);
  await dialog.getByLabel('Year').fill('2019');
  await dialog.getByLabel('Colour').fill('Blue');
  await dialog.getByLabel('Licence plate').fill('1234 AB');
  await dialog.getByRole('button', { name: 'Add vehicle' }).click();
  await expect(dialog).toBeHidden();

  const card = page.locator('[data-slot="vehicle-card"]', { hasText: label });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Blue · 1234 AB');
  // Four standard slots wait for dates.
  await expect(card.locator('[data-slot="document-row"]')).toHaveCount(4);
  await expect(card.getByText('Not set')).toHaveCount(4);

  // Insurance in ten days: due.
  await card.getByRole('button', { name: `Add Insurance for ${label}` }).click();
  const insurance = page.getByRole('dialog', { name: `Insurance for ${label}` });
  await expect(insurance.getByLabel('Document')).toHaveValue('Insurance');
  await insurance.getByLabel('Expires on').fill(daysFromNow(10));
  await insurance.getByLabel('Reference').fill('POL-778');
  await insurance.getByRole('button', { name: 'Save date' }).click();
  await expect(insurance).toBeHidden();
  const insuranceRow = card.locator('[data-slot="document-row"]', { hasText: 'Insurance' });
  await expect(insuranceRow).toContainText('Expires in 10 days');
  await expect(insuranceRow).toContainText('POL-778');
  await expect(insuranceRow).toHaveAttribute('data-state', 'due');

  // Fitness ran out yesterday: expired.
  await card.getByRole('button', { name: `Add Fitness for ${label}` }).click();
  const fitness = page.getByRole('dialog', { name: `Fitness for ${label}` });
  await fitness.getByLabel('Expires on').fill(daysFromNow(-1));
  await fitness.getByRole('button', { name: 'Save date' }).click();
  await expect(fitness).toBeHidden();
  const fitnessRow = card.locator('[data-slot="document-row"]', { hasText: 'Fitness' });
  await expect(fitnessRow).toContainText('Expired yesterday');
  await expect(fitnessRow).toHaveAttribute('data-state', 'expired');

  // A paper more than three months out says nothing, and a custom paper joins the list.
  await card.getByRole('button', { name: 'Other document' }).click();
  const other = page.getByRole('dialog', { name: 'New document' });
  await other.getByLabel('Document').fill('Road tax');
  await other.getByLabel('Expires on').fill(daysFromNow(200));
  await other.getByRole('button', { name: 'Save date' }).click();
  await expect(other).toBeHidden();
  const taxRow = card.locator('[data-slot="document-row"]', { hasText: 'Road tax' });
  await expect(taxRow).toHaveAttribute('data-state', 'ok');
  await expect(taxRow.locator('[data-slot="badge"]')).toHaveCount(0);
  await expect(taxRow.getByRole('button', { name: 'Renew' })).toHaveCount(0);

  // The page sums it up.
  await expect(page.locator('[data-slot="vehicle-summary"]')).toContainText(/\d+ expired/);

  // Each paper within three months has a renewal task that cannot be ticked off by hand.
  await page.goto('/tasks');
  const renewTitle = `Renew Fitness for ${label}`;
  await expect(page.getByText(renewTitle).first()).toBeVisible();
  await expect(page.getByText(`Renew Insurance for ${label}`).first()).toBeVisible();
  await expect(page.getByText(`Renew Road tax for ${label}`)).toHaveCount(0);
  const tick = page.getByRole('checkbox', { name: `Complete ${renewTitle}` }).first();
  await tick.click();
  await expect(
    page.getByText(/Enter the new expiry date on the Vehicles page first/).first()
  ).toBeVisible();
  await expect(tick).not.toBeChecked();

  // Renewing with a date further than three months out closes the task.
  await page.goto('/vehicles');
  await fitnessRow.getByRole('button', { name: 'Renew' }).click();
  const renew = page.getByRole('dialog', { name: 'Renew Fitness' });
  await expect(renew.getByLabel('New expiry date')).toHaveValue('');
  await renew.getByLabel('New expiry date').fill(daysFromNow(365));
  await renew.getByRole('button', { name: 'Save new date' }).click();
  await expect(renew).toBeHidden();
  await expect(fitnessRow).toHaveAttribute('data-state', 'ok');
  await expect(fitnessRow.locator('[data-slot="badge"]')).toHaveCount(0);

  await page.goto('/tasks');
  await expect(page.getByText(renewTitle)).toHaveCount(0);
  await page.goto('/tasks?done=1');
  await expect(page.getByText(renewTitle).first()).toBeVisible();
});
