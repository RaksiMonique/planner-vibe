import { defineConfig, devices } from '@playwright/test';

// Tests get their own port and env file so they never reuse a dev server that
// points at a hosted project.
const port = process.env.PORT ?? '3101';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

// Runs against the local Supabase stack (`npx supabase start`) through
// `.env.test.local`, which refuses hosted URLs. The global setup signs the test
// user in once.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global.setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry absorbs dev-mode compile stalls under parallel load.
  retries: 1,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  timeout: 60_000,
  // Dev-mode compiles make first paints slow under parallel load.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'public',
      testMatch: /(public|password)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'app',
      testIgnore: /(public|password|signout)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/owner.json' },
    },
    {
      name: 'app-mobile',
      testIgnore: /(public|password|signout)\.spec\.ts/,
      use: { ...devices['Pixel 7'], storageState: 'e2e/.auth/owner.json' },
    },
    {
      // Tablet width sits on the boundary between the stacked and desktop layouts.
      name: 'app-tablet',
      testMatch: /(pages|screenshots)\.spec\.ts/,
      use: {
        ...devices['iPad Mini'],
        browserName: 'chromium',
        storageState: 'e2e/.auth/owner.json',
      },
    },
    {
      // Signing out revokes the shared session, so this runs after the others.
      name: 'signout',
      testMatch: /signout\.spec\.ts/,
      dependencies: ['app', 'app-mobile', 'app-tablet'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/owner.json' },
    },
  ],
  webServer: {
    // A production build: Next allows one `next dev` per folder, and the
    // development server may already be running on 3100 against a hosted project.
    command: `npx dotenv -e .env.test.local -- next build && npx dotenv -e .env.test.local -- next start -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
