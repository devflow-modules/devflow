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

async function trackLegacyOperations(page: Page, legacyHits: string[]): Promise<void> {
  await page.route("**/api/admin/operations**", async (route) => {
    legacyHits.push(route.request().url());
    await route.fulfill({
      status: 410,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: "GONE — não deve ser chamado" }),
    });
  });
}

async function activeAiToggle(page: Page) {
  const pause = page.getByTestId("health-control-pause-ai");
  const resume = page.getByTestId("health-control-resume-ai");
  await expect(page.getByTestId("health-tenant-controls")).toBeVisible({ timeout: 60_000 });
  const pauseEnabled = await pause.isEnabled();
  return {
    pause,
    resume,
    pauseEnabled,
    target: pauseEnabled ? pause : resume,
    opposite: pauseEnabled ? resume : pause,
  };
}

test.describe("F0 smoke — dashboard/ai controlos por role", () => {
  test.describe.configure({ timeout: 120_000 });

  test("platform_admin: roles, loading/sucesso/erro, persistência, zero 410", async ({ page }) => {
    const legacyHits: string[] = [];
    await trackLegacyOperations(page, legacyHits);

    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await expect(page.getByTestId("system-health-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("health-tenant-controls")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("health-platform-controls")).toBeVisible();
    await expect(page.getByTestId("health-control-run-worker")).toBeVisible();
    await expect(page.getByTestId("health-control-reprocess")).toBeVisible();

    let toggle = await activeAiToggle(page);
    const className = (await toggle.target.getAttribute("class")) ?? "";
    expect(className).not.toMatch(/df-btn-disabled/);
    expect(className).toMatch(/df-btn-secondary/);

    // --- loading + anti double-click + sucesso (stub atrasado) ---
    let delayedPatches = 0;
    await page.route("**/api/operations/tenant**", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      delayedPatches += 1;
      await new Promise((r) => setTimeout(r, 900));
      const body = route.request().postDataJSON() as { aiEnabled?: boolean; automationEnabled?: boolean };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            aiEnabled: body.aiEnabled ?? true,
            automationEnabled: body.automationEnabled ?? true,
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // Um clique: Playwright não deve reenviar ao esperar o botão (disabled durante o voo).
    // Duplo clique / inFlightRef ficam cobertos pelo Vitest SystemHealthPanel.test.tsx.
    await toggle.target.click();
    await expect(page.getByTestId("health-controls")).toHaveAttribute("aria-busy", "true");
    await expect(toggle.opposite).toBeDisabled();
    await expect(page.getByTestId("health-control-feedback")).toHaveText("Alteração guardada.", {
      timeout: 20_000,
    });
    expect(delayedPatches).toBe(1);
    await page.unroute("**/api/operations/tenant**");

    // --- erro ---
    await page.route("**/api/operations/tenant**", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Sem permissão (smoke)" }),
      });
    });
    toggle = await activeAiToggle(page);
    await toggle.target.click();
    await expect(page.getByTestId("health-control-feedback")).toContainText(/Sem permissão/i, {
      timeout: 15_000,
    });
    await expect(toggle.target).toBeEnabled();
    await page.unroute("**/api/operations/tenant**");

    // --- persistência real (PATCH canónico) + restore ---
    toggle = await activeAiToggle(page);
    const startedWithPauseEnabled = toggle.pauseEnabled;
    const patchUrls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && req.url().includes("/api/operations/tenant")) {
        patchUrls.push(req.url());
      }
      if (req.url().includes("/api/admin/operations")) {
        legacyHits.push(req.url());
      }
    });

    await toggle.target.click();
    await expect(page.getByTestId("health-control-feedback")).toHaveText("Alteração guardada.", {
      timeout: 30_000,
    });
    expect(patchUrls.some((u) => u.includes("/api/operations/tenant"))).toBe(true);

    await page.reload();
    toggle = await activeAiToggle(page);
    // Após toggle: se começámos com pause enabled (IA on), agora resume enabled (IA off)
    expect(await toggle.pause.isEnabled()).toBe(!startedWithPauseEnabled);
    expect(await toggle.resume.isEnabled()).toBe(startedWithPauseEnabled);

    // Restore estado original
    await toggle.target.click();
    await expect(page.getByTestId("health-control-feedback")).toHaveText("Alteração guardada.", {
      timeout: 30_000,
    });
    await page.reload();
    toggle = await activeAiToggle(page);
    expect(await toggle.pause.isEnabled()).toBe(startedWithPauseEnabled);
    expect(await toggle.resume.isEnabled()).toBe(!startedWithPauseEnabled);

    expect(legacyHits).toEqual([]);
  });

  test("manager (verify stub): tenant ok, sem worker/reprocess, zero rota 410", async ({ page }) => {
    const legacyHits: string[] = [];
    const tenantPatches: string[] = [];

    await trackLegacyOperations(page, legacyHits);
    await page.route("**/api/operations/tenant**", async (route) => {
      if (route.request().method() === "PATCH") {
        tenantPatches.push(route.request().url());
        await new Promise((r) => setTimeout(r, 400));
        const body = route.request().postDataJSON() as { aiEnabled?: boolean };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              aiEnabled: body.aiEnabled ?? false,
              automationEnabled: true,
              updatedAt: new Date().toISOString(),
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await stubVerifyAsManager(page);
    await page.reload();

    await expect(page.getByTestId("system-health-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("health-tenant-controls")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("health-platform-controls")).toHaveCount(0);
    await expect(page.getByTestId("health-control-run-worker")).toHaveCount(0);
    await expect(page.getByTestId("health-control-reprocess")).toHaveCount(0);

    const toggle = await activeAiToggle(page);
    await toggle.target.click();
    await expect(page.getByTestId("health-controls")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("health-control-feedback")).toHaveText("Alteração guardada.", {
      timeout: 15_000,
    });
    expect(tenantPatches.length).toBe(1);
    expect(legacyHits).toEqual([]);
  });
});
