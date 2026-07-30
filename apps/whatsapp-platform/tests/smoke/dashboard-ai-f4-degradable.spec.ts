/**
 * Smoke F4 — carga degradável em /dashboard/ai (#203).
 * Simula falha de API secundária e falha essencial com retry localizado.
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=http://127.0.0.1:3099 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     npx playwright test tests/smoke/dashboard-ai-f4-degradable.spec.ts
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function assertPartialFailureKeepsEssentials(page: Page) {
  await page.route("**/api/ai/funnel-metrics**", (route) =>
    fulfillJson(route, 503, { success: false, error: "funnel down" })
  );

  await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
  await expect(page).toHaveURL(/\/dashboard\/ai/);
  await expect(page.getByTestId("dashboard-ai-page")).toBeVisible({ timeout: 60_000 });

  // Essenciais preservados
  await expect(page.getByRole("heading", { name: "Prioridades" })).toBeVisible();
  await expect(page.getByTestId("dashboard-ai-essential-kpis")).toBeVisible();

  // Secundário: erro localizado no funil (após abrir details)
  const advanced = page.getByTestId("dashboard-ai-advanced-metrics");
  await advanced.locator("> summary").click();
  const funnelErr = page.getByTestId("dashboard-ai-funnel-error");
  await expect(funnelErr).toBeVisible();
  await expect(funnelErr.getByText("Funil indisponível")).toBeVisible();
  await expect(funnelErr.getByRole("button", { name: "Tentar novamente" })).toBeVisible();

  // Essenciais e chrome F1 intactos
  await expect(page.locator("a.df-quick-action")).toHaveCount(2);
}

async function assertEssentialMetricsFailureWithRetry(page: Page) {
  let metricsCalls = 0;
  await page.route("**/api/ai/metrics**", async (route) => {
    metricsCalls += 1;
    if (metricsCalls === 1) {
      await fulfillJson(route, 500, { success: false, error: "metrics down" });
      return;
    }
    await route.continue();
  });

  await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
  await expect(page.getByTestId("dashboard-ai-page")).toBeVisible({ timeout: 60_000 });

  // Ações / health podem existir; KPIs com erro localizado
  await expect(page.getByTestId("dashboard-ai-metrics-error")).toBeVisible();
  const retry = page.getByTestId("dashboard-ai-metrics-error").getByRole("button", { name: "Tentar novamente" });
  await retry.click();

  await expect(page.getByTestId("dashboard-ai-essential-kpis")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("dashboard-ai-metrics-error")).toHaveCount(0);
}

test.describe("F4 smoke — dashboard/ai carga degradável", () => {
  test.describe.configure({ timeout: 120_000 });

  test("desktop: falha parcial (funil) mantém KPIs", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await assertPartialFailureKeepsEssentials(page);
  });

  test("mobile: falha essencial métricas + retry localizado", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await assertEssentialMetricsFailureWithRetry(page);
  });
});
