/**
 * Smoke visual SB-10 — ícones distintos das rotas /admin/* no rail (platform_admin).
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=<preview> PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     corepack pnpm exec playwright test tests/smoke/sidebar-sb10-admin-rail-icons.spec.ts
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

test.describe("SB-10 smoke — admin rail icons", () => {
  test("platform_admin rail: sete ícones admin distintos; labels/aria preservados", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await forceCollapsedSidebar(page);

    const rail = page.getByTestId("sidebar-rail");
    await expect(rail).toBeVisible({ timeout: 30_000 });

    const iconIds: string[] = [];
    for (const href of PLATFORM_HREFS) {
      const link = rail.locator(`a[href="${href}"]`);
      await expect(link).toHaveCount(1);
      const aria = await link.getAttribute("aria-label");
      expect(aria).toBeTruthy();
      const icon = link.locator("svg[data-rail-icon]");
      await expect(icon).toHaveCount(1);
      const id = await icon.getAttribute("data-rail-icon");
      expect(id).toBeTruthy();
      expect(id).not.toBe("generic");
      expect(id!.startsWith("admin-")).toBe(true);
      iconIds.push(id!);
    }

    expect(new Set(iconIds).size).toBe(PLATFORM_HREFS.length);
  });
});
