import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    timezoneId: 'Asia/Singapore',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-web-authentication-testing-api'],
        },
      },
    },
  ],
});
