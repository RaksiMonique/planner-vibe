import { test } from '@playwright/test';

// Visual check helper, not a test of behaviour: writes full-page screenshots
// of the main pages when SCREENSHOT_DIR is set, otherwise skips.
const dir = process.env.SCREENSHOT_DIR;
test.skip(!dir, 'SCREENSHOT_DIR not set');

for (const route of [
  '/dashboard',
  '/tasks',
  '/tasks?view=matrix',
  '/goals',
  '/segments',
  '/calendar',
  '/settings',
]) {
  test(`screenshot ${route}`, async ({ page }, testInfo) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const name = route.replace(/[/?=]+/g, '-').replace(/^-|-$/g, '') || 'home';
    await page.screenshot({ path: `${dir}/${testInfo.project.name}-${name}.png`, fullPage: true });
  });
}
