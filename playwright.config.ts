import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // The Filter tool plays a ~2.5 s scanner animation before showing its result.
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    // Functional tests run without animations (still background, no scanner) so they stay fast and
    // deterministic; the tests about animations opt back in with page.emulateMedia().
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321/fr/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
