/**
 * Portfolio screenshot capture — fictional fixtures only (local E2E mode).
 * Usage (from apps/applyflow):
 *   pnpm exec node ./scripts/capture-portfolio-screenshots.cjs
 *
 * Writes PNGs under docs/applyflow/assets/. Never targets non-local hosts.
 */
const { spawn } = require("node:child_process");
const { mkdirSync, existsSync } = require("node:fs");
const { resolve, join } = require("node:path");
const http = require("node:http");
const { chromium, expect } = require("@playwright/test");

const ROOT = resolve(__dirname, "../../..");
const APP = resolve(__dirname, "..");
const OUT = resolve(ROOT, "docs/applyflow/assets");
const PORT = 3017;
const BASE = `http://127.0.0.1:${PORT}`;
const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const VIEWPORT = { width: 1440, height: 900 };

function waitForUrl(url, timeoutMs = 180_000) {
  const start = Date.now();
  return new Promise((resolveWait, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolveWait();
          return;
        }
        retry();
      });
      req.on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for ${url}`));
        return;
      }
      setTimeout(tick, 800);
    };
    tick();
  });
}

function killTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    /* ignore */
  }
}

async function e2eLogin(request) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: {
      "content-type": "application/json",
      "x-applyflow-e2e-secret": E2E_SECRET,
    },
    data: { action: "login" },
  });
  if (response.status() !== 200) {
    throw new Error(`e2e login failed: ${response.status()}`);
  }
}

async function seedResume(page) {
  await page.goto("/dashboard");
  await expect(page.getByText("Procurar oportunidades")).toBeVisible({ timeout: 60_000 });
  const fileInput = page.locator('input[type="file"][accept*="json"]').first();
  await fileInput.setInputFiles(join(APP, "public/demo/portfolio-candidate-profile.json"));
  await expect(page.getByRole("button", { name: "Editar perfil" })).toBeVisible({ timeout: 30_000 });
}

async function hideDevChrome(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, [data-nextjs-toast], #__next-build-watcher,
      [data-next-badge], [data-nextjs-dev-overlay] { display: none !important; }
    `,
  });
}

async function shot(page, name) {
  await hideDevChrome(page);
  const path = join(OUT, name);
  await page.screenshot({
    path,
    fullPage: false,
    animations: "disabled",
  });
  console.log("wrote", path);
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const child = spawn(
    "pnpm",
    ["exec", "next", "dev", "-H", "127.0.0.1", "-p", String(PORT), "--webpack"],
    {
      cwd: APP,
      env: {
        ...process.env,
        APPLYFLOW_E2E: "1",
        APPLYFLOW_E2E_SECRET: E2E_SECRET,
        APPLYFLOW_E2E_PROVIDER_FIXTURES: "1",
        APPLYFLOW_E2E_IGNORE_SUPABASE: "1",
        APPLYFLOW_THEIRSTACK_ENABLED: "false",
        APPLYFLOW_PERSISTENCE_V2: "false",
        NEXT_PUBLIC_APPLYFLOW_URL: BASE,
        NODE_ENV: "development",
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let serverLog = "";
  child.stdout.on("data", (d) => {
    serverLog += d.toString();
  });
  child.stderr.on("data", (d) => {
    serverLog += d.toString();
  });

  try {
    await waitForUrl(BASE);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "dark",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    page.on("dialog", (dialog) => dialog.accept());

    // 1) Landing
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "ApplyFlow" })).toBeVisible();
    await shot(page, "applyflow-landing.png");

    await e2eLogin(page.request);
    await seedResume(page);

    // 2) Discovery + Match Preview (Remote OK fixture)
    await page.getByTestId("discovery-provider-remoteok").check();
    await page.getByTestId("discovery-search").click();
    await expect(page.getByTestId("discovery-hit").filter({ hasText: "E2E Fixture Remote Engineer" })).toBeVisible({
      timeout: 45_000,
    });
    const matchPreview = page.getByTestId("discovery-match-preview");
    await expect(matchPreview).toBeVisible({ timeout: 20_000 });
    const hit = page.getByTestId("discovery-hit").filter({ hasText: "E2E Fixture Remote Engineer" });
    await expect(hit).toBeVisible();
    // Bring discovery results into the upper viewport (avoid paste/consent chrome)
    await hit.evaluate((el) => {
      el.scrollIntoView({ block: "start", behavior: "instant" });
      const main = document.scrollingElement || document.documentElement;
      // Nudge up slightly so nav remains visible for brand context
      main.scrollTop = Math.max(0, main.scrollTop - 72);
    });
    await page.waitForTimeout(250);
    await shot(page, "applyflow-discovery.png");
    await page.getByTestId("discovery-save").click();
    await expect(page.getByText(/Guardada|já está/i).first()).toBeVisible({ timeout: 20_000 });

    // Also save Jobgether hit for denser queue
    await page.getByTestId("discovery-provider-jobgether").check();
    await page.getByTestId("discovery-search").click();
    await expect(page.getByTestId("discovery-hit").filter({ hasText: "E2E Fixture Frontend Engineer" })).toBeVisible({
      timeout: 45_000,
    });
    await page.getByTestId("discovery-save").click();
    await expect(page.getByText(/Guardada|já está/i).first()).toBeVisible({ timeout: 20_000 });

    // 3) Opportunity Queue
    await page.getByTestId("job-queue-view-active").click();
    await expect(page.getByTestId("job-inbox-card-job_ro_e2e-ro-1")).toBeVisible();
    await page.getByTestId("job-opportunity-queue").scrollIntoViewIfNeeded();
    await shot(page, "applyflow-queue.png");

    // 4) Analysis + Readiness
    await page.getByRole("link", { name: "Analisar vaga" }).first().click();
    await expect(page.getByTestId("application-readiness")).toBeVisible({ timeout: 45_000 });
    await shot(page, "applyflow-readiness.png");

    // 5) Lifecycle (screening)
    await page.getByTestId("register-application").click();
    await expect(page.getByTestId("mark-application-sent")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("mark-application-sent").click();
    await expect(page.getByTestId("lifecycle-screening")).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId("lifecycle-screening").click();
    await expect(page.getByTestId("application-current-state")).toBeVisible();
    await expect(page.getByTestId("application-next-action")).toBeVisible();
    await page.getByTestId("application-current-state").scrollIntoViewIfNeeded();
    await shot(page, "applyflow-lifecycle.png");

    // 6) Applications — fictional demo dataset (multiple statuses)
    await page.goto("/dashboard");
    await expect(page.getByText("Procurar oportunidades")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /Carregar demo/i }).click();
    await expect(page.getByRole("heading", { name: /Candidaturas/i })).toBeVisible({ timeout: 30_000 });
    await page.locator("#applications").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await shot(page, "applyflow-applications.png");

    await browser.close();

    const required = [
      "applyflow-landing.png",
      "applyflow-discovery.png",
      "applyflow-queue.png",
      "applyflow-readiness.png",
      "applyflow-lifecycle.png",
      "applyflow-applications.png",
    ];
    for (const file of required) {
      if (!existsSync(join(OUT, file))) {
        throw new Error(`Missing screenshot: ${file}`);
      }
    }
    console.log("Portfolio screenshots complete.");
  } catch (error) {
    console.error(error);
    console.error("--- server log (tail) ---");
    console.error(serverLog.slice(-4000));
    process.exitCode = 1;
  } finally {
    killTree(child);
  }
}

main();
