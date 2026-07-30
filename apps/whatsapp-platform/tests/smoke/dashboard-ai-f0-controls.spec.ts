/**
 * Smoke F0 — controlos operacionais em /dashboard/ai.
 * Não commitar credenciais; lê E2E_* do ambiente.
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=https://…vercel.app npx playwright test tests/smoke/dashboard-ai-f0-controls.spec.ts
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

async function stubVerifyAsManager(page: Page): Promise<void> {
  await page.route("**/api/auth/verify", async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          valid: true,
          user: {
            id: "e2e-manager-stub",
            email: "manager-stub@example.com",
            role: "manager",
            tenantId: "e2e-tenant",
          },
        },
      }),
    });
  });
}

test.describe("F0 smoke — dashboard/ai controlos por role", () => {
  test("platform_admin: tenant + plataforma; PATCH só em /api/operations/tenant", async ({
    page,
  }) => {
    const legacyHits: string[] = [];
    const tenantPatches: string[] = [];

    await page.route("**/api/admin/operations**", async (route) => {
      legacyHits.push(route.request().url());
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "GONE — não deve ser chamado" }),
      });
    });

    await page.route("**/api/operations/tenant**", async (route) => {
      if (route.request().method() === "PATCH") {
        tenantPatches.push(route.request().url());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { aiEnabled: false, automationEnabled: true, updatedAt: new Date().toISOString() },
          }),
        });
        return;
      }
      await route.continue();
    });

    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);

    const panel = page.getByTestId("system-health-panel");
    await expect(panel).toBeVisible({ timeout: 60_000 });

    await expect(page.getByTestId("health-tenant-controls")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("health-platform-controls")).toBeVisible();
    await expect(page.getByTestId("health-control-run-worker")).toBeVisible();
    await expect(page.getByTestId("health-control-reprocess")).toBeVisible();

    const pause = page.getByTestId("health-control-pause-ai");
    const resume = page.getByTestId("health-control-resume-ai");
    // Um dos dois está habilitado conforme estado operacional
    const pauseEnabled = await pause.isEnabled();
    const target = pauseEnabled ? pause : resume;
    await expect(target).toBeEnabled();
    const className = (await target.getAttribute("class")) ?? "";
    expect(className).not.toMatch(/df-btn-disabled/);
    expect(className).toMatch(/df-btn-secondary/);

    await target.click();
    await expect(page.getByTestId("health-control-feedback")).toBeVisible({ timeout: 15_000 });
    expect(tenantPatches.length).toBeGreaterThanOrEqual(1);
    expect(legacyHits).toEqual([]);
  });

  test("manager (verify stub): controla tenant e não vê ações de plataforma", async ({ page }) => {
    const legacyHits: string[] = [];
    const tenantPatches: string[] = [];

    await page.route("**/api/admin/operations**", async (route) => {
      legacyHits.push(route.request().url());
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "GONE" }),
      });
    });

    await page.route("**/api/operations/tenant**", async (route) => {
      if (route.request().method() === "PATCH") {
        tenantPatches.push(route.request().url());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { aiEnabled: false, automationEnabled: true, updatedAt: new Date().toISOString() },
          }),
        });
        return;
      }
      await route.continue();
    });

    // Login real (cookie); só depois stub de role — não interferir no fluxo de autenticação.
    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await stubVerifyAsManager(page);
    await page.reload();

    await expect(page.getByTestId("system-health-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("health-tenant-controls")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("health-platform-controls")).toHaveCount(0);
    await expect(page.getByTestId("health-control-run-worker")).toHaveCount(0);
    await expect(page.getByTestId("health-control-reprocess")).toHaveCount(0);

    const pause = page.getByTestId("health-control-pause-ai");
    const resume = page.getByTestId("health-control-resume-ai");
    const target = (await pause.isEnabled()) ? pause : resume;
    await target.click();
    await expect(page.getByTestId("health-control-feedback")).toBeVisible({ timeout: 15_000 });
    expect(tenantPatches.length).toBeGreaterThanOrEqual(1);
    expect(legacyHits).toEqual([]);
  });
});
