import { expect, test } from '@playwright/test';

// Every Release 1 page renders for a signed-in user with seeded data.
const ROUTES: Array<[string, RegExp]> = [
  ['/dashboard', /good (morning|afternoon|evening)/i],
  ['/tasks', /tasks/i],
  ['/goals', /goals/i],
  ['/projects', /projects/i],
  ['/segments', /segments/i],
  ['/calendar', /calendar/i],
  ['/settings', /settings/i],
  ['/settings/data', /data/i],
  // Release 2
  ['/week', /week/i],
  ['/month', /month|overview/i],
  ['/habits', /habits/i],
  ['/routines', /routines/i],
  ['/time', /time/i],
  ['/notifications', /notifications/i],
];

for (const [route, heading] of ROUTES) {
  test(`${route} renders @smoke`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')));
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    if (route === '/calendar') {
      // FullCalendar loads on the client; its controller title proves the grid mounted.
      await expect(page.getByRole('heading', { level: 3 })).toContainText(/\d{4}/, {
        timeout: 30_000,
      });
    }
    expect(errors, 'no uncaught browser errors').toEqual([]);
  });
}
