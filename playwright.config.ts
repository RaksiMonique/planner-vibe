import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT ?? '3100';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

// Runs against a local Supabase stack (`npx supabase start`) with `.env.local`
// pointing at it. The global setup signs the test user in once.
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
    command: process.env.CI ? `npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
