/**
 * Smoke F2 — métricas enxutas + progressive disclosure em /dashboard/ai (#197).
 * Regressão F1 chrome e F0 controlos.
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=http://127.0.0.1:3099 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     npx playwright test tests/smoke/dashboard-ai-f2-metrics.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

async function assertMetricsSurface(page: Page) {
  await expect(page.getByTestId("dashboard-ai-page")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Prioridades" })).toBeVisible();

  // F1 chrome preservado
  await expect(page.locator("a.df-quick-action")).toHaveCount(2);

  // KPIs essenciais: % automação uma vez no caminho principal
  const essential = page.getByTestId("dashboard-ai-essential-kpis");
  await expect(essential).toBeVisible();
  await expect(essential.getByText("% automação")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Resumo" })).toHaveCount(0);

  // CRM/funil em details (não expandidos por omissão no caminho principal)
  const advanced = page.getByTestId("dashboard-ai-advanced-metrics");
  await expect(advanced).toBeVisible();
  await expect(advanced).not.toHaveAttribute("open");
  await expect(page.getByTestId("dashboard-ai-lead-quality")).toBeHidden();

  await advanced.locator("> summary").click();
  await expect
    .poll(async () => advanced.evaluate((el) => (el as HTMLDetailsElement).open))
    .toBe(true);
  await expect(page.getByTestId("dashboard-ai-lead-quality")).toBeVisible();
  await expect(page.getByTestId("dashboard-ai-opportunities")).toBeVisible();
  await expect(page.getByTestId("dashboard-ai-funnel")).toBeVisible();

  // Extra event metrics also disclosed
  const extra = page.getByTestId("dashboard-ai-extra-event-metrics");
  await expect(extra).toBeVisible();
  const extraOpen = await extra.evaluate((el) => (el as HTMLDetailsElement).open);
  if (!extraOpen) await extra.locator("> summary").click();
  await expect(extra.getByText("Fallbacks")).toBeVisible();

  // F0: controlos no health details
  const health = page.getByTestId("system-health-details");
  const healthOpen = await health.evaluate((el) => (el as HTMLDetailsElement).open);
  if (!healthOpen) await health.locator("> summary").click();
  await expect(page.getByTestId("health-tenant-controls")).toBeVisible({ timeout: 30_000 });
  const pause = page.getByTestId("health-control-pause-ai");
  const resume = page.getByTestId("health-control-resume-ai");
  const target = (await pause.isEnabled()) ? pause : resume;
  await expect(target).toBeEnabled();
  expect((await target.getAttribute("class")) ?? "").not.toMatch(/df-btn-disabled/);
}

test.describe("F2 smoke — dashboard/ai métricas", () => {
  test.describe.configure({ timeout: 90_000 });

  test("desktop: KPIs essenciais, details CRM, F0/F1 ok", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await assertMetricsSurface(page);
  });

  test("mobile: mesmos gates", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await assertMetricsSurface(page);
  });
});
