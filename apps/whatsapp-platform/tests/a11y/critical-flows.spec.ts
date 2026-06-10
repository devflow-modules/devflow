import { expect, test } from "@playwright/test";
import { createDefaultInboxMockStore, installInboxOperationalMocks } from "../e2e/helpers/inbox-api-mock";
import { navigateAsWhatsappAdmin } from "../e2e/helpers/whatsapp-auth";
import { useAuthenticatedA11yContext } from "./helpers/authenticated-context";
import { expectNoSeriousViolationsForPage } from "./helpers/axe-wcag";

/** Evitar `networkidle` no `next dev` (HMR / pedidos longos — nunca fica “idle”). */
async function waitAppStable(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
}

test.describe("A11y — fluxos críticos (axe, WCAG 2.1 AA)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("login (/login)", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("E-mail")).toBeVisible({ timeout: 30_000 });
    await expectNoSeriousViolationsForPage(page, "login");
  });

  test.describe("sessão E2E (E2E_WHATSAPP_ADMIN_EMAIL / E2E_WHATSAPP_ADMIN_PASSWORD)", () => {
    useAuthenticatedA11yContext();

    test("dashboard (/dashboard)", async ({ page }) => {
      await navigateAsWhatsappAdmin(page, { next: "/dashboard" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/dashboard/);
      await expectNoSeriousViolationsForPage(page, "dashboard");
    });

    test("inbox (/inbox) com mocks API", async ({ page }) => {
      const store = createDefaultInboxMockStore();
      await installInboxOperationalMocks(page, store);
      await navigateAsWhatsappAdmin(page, { next: "/inbox" });
      await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 60_000 });
      await expectNoSeriousViolationsForPage(page, "inbox");
    });

    test("histórico de conversas (/conversations)", async ({ page }) => {
      await navigateAsWhatsappAdmin(page, { next: "/conversations" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/conversations/);
      await expectNoSeriousViolationsForPage(page, "conversations");
    });

    test("definições de IA (/settings/ai)", async ({ page }) => {
      await navigateAsWhatsappAdmin(page, { next: "/settings/ai" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/settings\/ai/);
      await expectNoSeriousViolationsForPage(page, "settings/ai");
    });

    test("billing (/billing) — apenas se rota comercial estiver visível", async ({ page }) => {
      await navigateAsWhatsappAdmin(page, { next: "/billing" });
      await waitAppStable(page);
      if (!/\/billing/.test(page.url())) {
        test.skip(
          true,
          "Billing não exposto (ex.: NEXT_PUBLIC_PRODUCT_MODE≠SAAS). Ver docs/accessibility/WCAG-AA-CHECKLIST.md."
        );
      }
      await expectNoSeriousViolationsForPage(page, "billing");
    });

    test("admin WhatsApp (/admin/whatsapp) — apenas platform_admin", async ({ page }) => {
      await navigateAsWhatsappAdmin(page, { next: "/admin/whatsapp" });
      await waitAppStable(page);
      if (!page.url().includes("/admin/whatsapp")) {
        test.skip(
          true,
          "Redirecionado fora de /admin/whatsapp (conta E2E precisa de platform_admin). Documentar exceção no checklist."
        );
      }
      await expectNoSeriousViolationsForPage(page, "admin/whatsapp");
    });

    test("modal de suporte (inbox + diálogo aberto)", async ({ page }) => {
      const store = createDefaultInboxMockStore();
      await installInboxOperationalMocks(page, store);
      await navigateAsWhatsappAdmin(page, { next: "/inbox" });
      await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 60_000 });
      await page.getByRole("button", { name: "Precisa de ajuda?" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoSeriousViolationsForPage(page, "support-modal-open");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
      await expectNoSeriousViolationsForPage(page, "inbox-após-fechar-modal-suporte");
    });
  });
});
