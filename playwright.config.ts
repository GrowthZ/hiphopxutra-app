import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the local Firebase emulators (project demo-hiphopxutra), never production.
// Run with `bun run test:e2e`, which starts the emulators around `playwright test`.
const PORT = 3200;

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1, // the specs share one emulator database
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `bunx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { VITE_FIREBASE_EMULATORS: 'true' },
    reuseExistingServer: true, // lets you keep `VITE_FIREBASE_EMULATORS=true bun run dev -- --port 3200` open while iterating
    timeout: 60_000,
  },
});
