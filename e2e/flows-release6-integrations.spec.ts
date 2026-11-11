import { expect, test } from './test';

test('the calendar feed switches on, serves iCalendar at its address, and switches off', async ({
  page,
}) => {
  await page.goto('/settings/integrations');
  const switchOn = page.getByRole('button', { name: /switch the feed on/i });
  if (await switchOn.isVisible()) await switchOn.click();
  const address = page.getByLabel('Subscription address');
  await expect(address).toBeVisible();
  const url = new URL(await address.inputValue());
  expect(url.pathname).toBe('/api/calendar/feed.ics');
  expect(url.searchParams.get('token')?.length ?? 0).toBeGreaterThan(16);

  // Token is the only credential: a plain request with no session reads the feed.
  const feed = await page.request.get(url.pathname + url.search, { headers: { cookie: '' } });
  expect(feed.status()).toBe(200);
  expect(feed.headers()['content-type']).toContain('text/calendar');
  const body = await feed.text();
  expect(body).toContain('BEGIN:VCALENDAR');
  expect(body).toContain('END:VCALENDAR');

  await page.getByRole('button', { name: /switch the feed off/i }).click();
  await expect(page.getByRole('button', { name: /switch the feed on/i })).toBeVisible();
  const gone = await page.request.get(url.pathname + url.search, { headers: { cookie: '' } });
  expect(gone.status()).toBe(404);
});

test('reminder channel settings save', async ({ page }) => {
  await page.goto('/settings/integrations');
  await page.getByLabel('Daily digest at').selectOption('8');
  await page.getByRole('button', { name: /save reminder settings/i }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Daily digest at')).toHaveValue('8');
});
