import { defineConfig, devices } from '@playwright/test'

// Smoke test against local Supabase. Start it first:
//   npx supabase start
// Edge Functions are optional: without them Vehicles use the general
// schedule and the silhouette, which is what the test expects.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5174',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite --mode e2e --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
