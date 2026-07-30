/**
 * Smoke F1 — hierarquia / chrome da 1ª dobra em /dashboard/ai (#194).
 * Não amplia para F2 (KPIs/funil). Regressão F0: controlos no details.
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=http://127.0.0.1:3099 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     npx playwright test tests/smoke/dashboard-ai-f1-hierarchy.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

async function assertFirstFoldHierarchy(page: Page) {
  await expect(page.getByTestId("dashboard-ai-page")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Prioridades" })).toBeVisible();

  // ≤2 quickActions; sem Inbox / Motor / Abrir Inbox
  const quickLinks = page.locator("a.df-quick-action");
  await expect(quickLinks).toHaveCount(2);
  await expect(quickLinks.nth(0)).toHaveText("IA base");
  await expect(quickLinks.nth(1)).toHaveText("Uso da IA");
  await expect(page.getByRole("link", { name: "Abrir Inbox" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Motor (config. gerais)" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ir para inbox" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ver leads HIGH" })).toHaveCount(0);

  // Sinal crítico + ações (ou empty) antes do painel operacional expandido
  await expect(page.getByTestId("health-critical-signal")).toBeVisible();
  const actions = page.getByRole("region", { name: "Ações recomendadas" });
  const empty = page.getByTestId("dashboard-ai-actions-empty");
  await expect(actions.or(empty)).toBeVisible();

  // Health completo em details (recolhido se OK; aberto se atenção/crítico)
  const details = page.getByTestId("system-health-details");
  await expect(details).toBeVisible();
  await expect(details.getByText("Canal e controlos operacionais")).toBeVisible();

  const alreadyOpen = await details.evaluate((el) => (el as HTMLDetailsElement).open);
  if (!alreadyOpen) {
    await details.locator("summary").click();
  }
  await expect
    .poll(async () => details.evaluate((el) => (el as HTMLDetailsElement).open))
    .toBe(true);

  await expect(page.getByTestId("system-health-panel")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("health-tenant-controls")).toBeVisible({ timeout: 30_000 });
  const pause = page.getByTestId("health-control-pause-ai");
  const resume = page.getByTestId("health-control-resume-ai");
  const target = (await pause.isEnabled()) ? pause : resume;
  await expect(target).toBeEnabled();
  const cls = (await target.getAttribute("class")) ?? "";
  expect(cls).toMatch(/df-btn-secondary/);
  expect(cls).not.toMatch(/df-btn-disabled/);

  // platform_admin E2E: worker visível
  await expect(page.getByTestId("health-platform-controls")).toBeVisible();
}

test.describe("F1 smoke — dashboard/ai hierarquia 1ª dobra", () => {
  test.describe.configure({ timeout: 90_000 });

  test("desktop: prioridades, ≤2 quick links, health em details, F0 ok", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await assertFirstFoldHierarchy(page);
  });

  test("mobile: mesmos gates da 1ª dobra", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await assertFirstFoldHierarchy(page);
  });
});
