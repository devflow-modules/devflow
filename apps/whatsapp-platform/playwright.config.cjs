const path = require("path");
const { defineConfig, devices } = require("@playwright/test");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });

const baseURL =
  process.env.E2E_WHATSAPP_BASE_URL?.trim() ||
  process.env.E2E_BASE_URL?.trim() ||
  "http://127.0.0.1:3099";

function isLocalBaseUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

const useLocalWebServer =
  isLocalBaseUrl(baseURL) && process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1";

module.exports = defineConfig({
  /** Inclui `tests/e2e` e `tests/a11y`; filtre com `pnpm exec playwright test tests/e2e` ou `tests/a11y`. */
  testDir: "./tests",
  globalSetup: require.resolve("./tests/setup/global-auth.setup.ts"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  ...(useLocalWebServer
    ? {
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
      }
    : {}),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
