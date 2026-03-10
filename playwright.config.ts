import { defineConfig, devices } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";

// Load .env so BASE_URL is available without shell export
dotenvConfig();

// Extract port from BASE_URL for webServer config
const baseUrl = process.env.BASE_URL ?? "http://localhost:3002";
const appPort = baseUrl.match(/:(\d+)/)?.[1] ?? "3002";
const webServerUrl = `http://localhost:${appPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",

  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Reuse an already-running dev server; do NOT auto-start one.
  // Run `npm run dev` before `npm run test:e2e`.
  webServer: {
    command: "npm run dev",
    url: webServerUrl,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
