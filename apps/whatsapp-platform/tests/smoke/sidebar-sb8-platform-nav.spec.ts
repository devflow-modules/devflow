/**
 * Smoke SB-8 — platformNav derivado de ROUTE_META.platformOnly (expandido + rail).
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=<preview> PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     corepack pnpm exec playwright test tests/smoke/sidebar-sb8-platform-nav.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

const PLATFORM_HREFS = [
  "/admin/metrics",
  "/admin/billing",
  "/admin/affiliates",
  "/admin/tenants",
  "/admin/agents",
  "/admin/conversations",
  "/admin/whatsapp",
] as const;

async function forceCollapsedSidebar(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("df-shell-sidebar-collapsed", "1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function forceExpandedSidebar(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("df-shell-sidebar-collapsed", "0");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
}

test.describe("SB-8 smoke — platformNav canónico", () => {
  test("platform_admin expandido: cada platformOnly uma vez; labels visíveis", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await forceExpandedSidebar(page);

    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sidebar-sensitive-section-plataforma")).toBeAttached();

    for (const href of PLATFORM_HREFS) {
      const links = sidebar.locator(`a[href="${href}"]`);
      await expect(links).toHaveCount(1);
    }
  });

  test("platform_admin rail: mesmas rotas platformOnly, uma vez cada", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await forceCollapsedSidebar(page);

    const rail = page.getByTestId("sidebar-rail");
    await expect(rail).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sidebar-rail-sensitive-divider")).toBeAttached();

    for (const href of PLATFORM_HREFS) {
      await expect(rail.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
  });

  test("manager (verify override): sem secção Plataforma / sem /admin/* na shell", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });

    await page.route("**/api/auth/verify", async (route) => {
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
              id: "e2e-manager-sb8",
              role: "manager",
              tenantId: "e2e-tenant",
            },
          },
        }),
      });
    });

    await forceExpandedSidebar(page);
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible({ timeout: 30_000 });

    await expect(page.getByTestId("sidebar-sensitive-section-plataforma")).toHaveCount(0);
    for (const href of PLATFORM_HREFS) {
      await expect(sidebar.locator(`a[href="${href}"]`)).toHaveCount(0);
    }
  });
});
