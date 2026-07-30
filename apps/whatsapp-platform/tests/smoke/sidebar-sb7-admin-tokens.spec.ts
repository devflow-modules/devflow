/**
 * Smoke visual SB-7 — chrome admin sensível com tokens --df-admin-* (expandido + rail).
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=<preview> PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     corepack pnpm exec playwright test tests/smoke/sidebar-sb7-admin-tokens.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

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

function assertNoAmberToken(className: string | null) {
  expect(className ?? "").not.toMatch(/\bamber-/);
}

test.describe("SB-7 smoke — admin tokens sidebar", () => {
  test("expandido: secção Plataforma e link sensível usam --df-admin-*", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await forceExpandedSidebar(page);

    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible({ timeout: 30_000 });

    for (const id of ["automacao_ia", "conta", "plataforma"]) {
      const chrome = page.getByTestId(`sidebar-sensitive-section-${id}`);
      await expect(chrome).toBeAttached();
      const cls = await chrome.getAttribute("class");
      expect(cls).toMatch(/--df-admin-/);
      assertNoAmberToken(cls);
    }

    const metrics = page.getByTestId("sidebar-sensitive-link");
    await expect(metrics).toBeVisible();
    const metricsClass = await metrics.getAttribute("class");
    expect(metricsClass).toMatch(/--df-admin-/);
    assertNoAmberToken(metricsClass);

    // Activo: navegar e confirmar marca (não idle admin)
    await metrics.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(/\/admin\/metrics/, { timeout: 30_000 }),
      metrics.click(),
    ]);
    const activeClass = await page.getByTestId("sidebar-sensitive-link").getAttribute("class");
    expect(activeClass).toMatch(/--df-brand-/);
    expect(activeClass ?? "").not.toMatch(/--df-admin-800/);
    assertNoAmberToken(activeClass);
  });

  test("rail: divider Plataforma usa --df-admin-*; sem amber no chrome", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await forceCollapsedSidebar(page);

    const rail = page.getByTestId("sidebar-rail");
    await expect(rail).toBeVisible({ timeout: 30_000 });

    // Divider is aria-hidden (decorative) — assert attachment + tokens, not visibility.
    const divider = page.getByTestId("sidebar-rail-sensitive-divider");
    await expect(divider).toBeAttached();
    const dividerClass = await divider.getAttribute("class");
    expect(dividerClass).toMatch(/--df-admin-/);
    assertNoAmberToken(dividerClass);

    const railHtml = await rail.innerHTML();
    expect(railHtml).not.toMatch(/\bamber-/);
  });
});
