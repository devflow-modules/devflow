const { defineConfig, devices } = require("@playwright/test");

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const baseURL =
  process.env.E2E_APPLYFLOW_BASE_URL?.trim() ||
  process.env.E2E_BASE_URL?.trim() ||
  "http://127.0.0.1:3012";

function assertSafeBaseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`E2E refused invalid base URL`);
  }
  const host = parsed.hostname;
  const allowed = host === "127.0.0.1" || host === "localhost";
  if (!allowed) {
    throw new Error(`E2E refused non-local host: ${host}`);
  }
  if (host.includes("supabase") || url.includes("qygwhuwvilkekfkgoizb")) {
    throw new Error("E2E refused production Supabase host");
  }
}

assertSafeBaseUrl(baseURL);

const useLocalWebServer =
  (baseURL.includes("127.0.0.1") || baseURL.includes("localhost")) &&
  process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1";

const LOCAL_DATABASE_URL =
  "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow";

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = LOCAL_DATABASE_URL;
  process.env.DIRECT_URL = LOCAL_DATABASE_URL;
}

// Always pin V2 E2E webServer to isolated local Docker — never inherit remote .env.local.
const v2WebServerEnv = {
  ...process.env,
  DATABASE_URL: LOCAL_DATABASE_URL,
  DIRECT_URL: LOCAL_DATABASE_URL,
  APPLYFLOW_E2E: "1",
  APPLYFLOW_E2E_SECRET: E2E_SECRET,
  APPLYFLOW_E2E_PROVIDER_FIXTURES: "1",
  APPLYFLOW_E2E_IGNORE_SUPABASE: "1",
  APPLYFLOW_THEIRSTACK_ENABLED: "false",
  APPLYFLOW_PERSISTENCE_V2: "true",
  APPLYFLOW_DB_TARGET: "local",
  NODE_ENV: "development",
  THEIRSTACK_API_KEY: "should-not-be-used",
  NEXT_PUBLIC_APPLYFLOW_URL: "http://127.0.0.1:3012",
};

module.exports = defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/v2-cloud-*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  ...(useLocalWebServer
    ? {
        webServer: {
          command: "pnpm exec next dev -H 127.0.0.1 -p 3012 --webpack",
          cwd: __dirname,
          url: "http://127.0.0.1:3012",
          reuseExistingServer: false,
          timeout: 180_000,
          env: v2WebServerEnv,
        },
      }
    : {}),
  projects: [{ name: "chromium-v2", use: { ...devices["Desktop Chrome"] } }],
});
