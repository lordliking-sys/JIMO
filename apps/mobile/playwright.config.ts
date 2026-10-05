import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
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
  webServer: {
    command: 'node test/serve-web.cjs',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
});
