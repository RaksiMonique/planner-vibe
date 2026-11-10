import { test as base, expect, type Page } from '@playwright/test';

/**
 * `page.goto` resolves on the load event, before React has hydrated. A click
 * or keypress sent in that gap is lost, and the mobile dashboard is large
 * enough for the gap to matter. The root layout marks the document once
 * hydration has run; every navigation here waits for that mark. The first
 * page after `next start` can take a while to hydrate, hence the long wait.
 */
export const test = base.extend({
  page: async ({ page }, run) => {
    const goto = page.goto.bind(page);
    page.goto = async (url: string, options?: Parameters<Page['goto']>[1]) => {
      const response = await goto(url, options);
      await page
        .locator('html[data-hydrated="true"]')
        .waitFor({ state: 'attached', timeout: 30_000 });
      return response;
    };
    await run(page);
  },
});

export { expect };
