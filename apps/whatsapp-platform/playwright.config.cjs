const path = require("path");
const { defineConfig, devices } = require("@playwright/test");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3099",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec next dev -H 127.0.0.1 -p 3099",
    cwd: __dirname,
    url: "http://127.0.0.1:3099",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE: "1",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
