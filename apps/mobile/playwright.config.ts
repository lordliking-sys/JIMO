import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  globalTeardown: './test/cleanup-api.ts',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 390, height: 844 },
    locale: 'it-IT',
    reducedMotion: 'reduce',
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    ...(process.env.DATABASE_URL
      ? [
          {
            command: 'NODE_ENV=test pnpm exec tsx integration/serve-e2e.ts',
            cwd: '../api',
            url: `http://localhost:${process.env.E2E_API_PORT ?? 4301}/ready`,
            reuseExistingServer: false,
            timeout: 60000,
            gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 15000 },
          },
        ]
      : []),
    {
      command: 'node test/serve-web.cjs',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
    },
  ],
});
