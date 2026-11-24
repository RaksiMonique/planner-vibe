import { expect, test } from './test';

const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const pad = (n: number) => String(n).padStart(2, '0');
const localKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

test('a fortnightly routine with an appointment runs today and lands on the calendar', async ({
  page,
}) => {
  test.slow();
  const name = `Salon visit ${stamp}`;
  const place = `Glow Salon ${stamp}`;
  const today = new Date();
  const todayKey = localKey(today);

  await page.goto('/routines');
  await page
    .getByRole('button', { name: /new routine/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'New routine' });
  await dialog.getByLabel('Name').fill(name);

  await dialog.getByLabel('Repeats').click();
  await page.getByRole('option', { name: 'Every 2 weeks' }).click();
  await dialog.getByLabel('First on').fill(todayKey);
  // Only today's weekday, so the routine is due today and in two weeks.
  const days = dialog.getByRole('group', { name: 'Days of the week' });
  for (const label of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
    const box = days.getByLabel(label);
    const wanted = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()] === label;
    if ((await box.isChecked()) !== wanted) await days.getByText(label).click();
  }

  await dialog.getByLabel('This routine has an appointment').check();
  await dialog.getByLabel('Time', { exact: true }).fill('10:30');
  await dialog.getByLabel('Minutes', { exact: true }).fill('45');
  await dialog.getByLabel('Place', { exact: true }).fill(place);
  await dialog.getByLabel('Step 1 title').fill('Deep condition');
  await dialog.getByRole('button', { name: 'Create routine' }).click();
  await expect(dialog).toBeHidden();

  // The card says how it repeats and carries the appointment.
  const card = page.locator('[data-slot="card"]', { hasText: name }).last();
  await expect(card.locator('[data-slot="routine-cadence"]')).toContainText('Every 2 weeks');
  await expect(card.locator('[data-slot="routine-cadence"]')).toContainText('next today');
  await expect(card.locator('[data-slot="routine-appointment"]')).toContainText(
    `Appointment 10:30 · 45 min · ${place}`
  );

  // Due today: its step is in the Today checklist.
  await expect(
    page.getByRole('checkbox', { name: `${name}: Deep condition` }).first()
  ).toBeVisible();

  // The appointment is a calendar event, so the week view lists it today.
  await page.goto(`/week?date=${todayKey}`);
  const dayCard = page.locator('[data-slot="card"]', { hasText: name }).first();
  await expect(dayCard).toContainText('10:30');

  // Two weeks on it is due again; one week on it is not.
  const inAWeek = new Date(today);
  inAWeek.setDate(today.getDate() + 7);
  await page.goto(`/week?date=${localKey(inAWeek)}`);
  await expect(page.getByText(name)).toHaveCount(0);
  const inTwoWeeks = new Date(today);
  inTwoWeeks.setDate(today.getDate() + 14);
  await page.goto(`/week?date=${localKey(inTwoWeeks)}`);
  await expect(page.getByText(name).first()).toBeVisible();
});

test('a monthly routine without an appointment keeps the calendar clear', async ({ page }) => {
  const name = `Deep clean ${stamp}`;
  const today = new Date();
  await page.goto('/routines');
  await page
    .getByRole('button', { name: /new routine/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'New routine' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Repeats').click();
  await page.getByRole('option', { name: 'Every month' }).click();
  await expect(dialog.getByRole('group', { name: 'Days of the week' })).toBeHidden();
  await dialog.getByLabel('First on').fill(localKey(today));
  await dialog.getByLabel('Step 1 title').fill('Wipe the skirting');
  await dialog.getByRole('button', { name: 'Create routine' }).click();
  await expect(dialog).toBeHidden();

  const card = page.locator('[data-slot="card"]', { hasText: name }).last();
  await expect(card.locator('[data-slot="routine-cadence"]')).toContainText(
    /Every month on the \d+(st|nd|rd|th) · next today/
  );
  await expect(card.locator('[data-slot="routine-appointment"]')).toHaveCount(0);
});
