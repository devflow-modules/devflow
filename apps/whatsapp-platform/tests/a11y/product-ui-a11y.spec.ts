import { expect, test } from "@playwright/test";
import { createDefaultInboxMockStore, installInboxOperationalMocks } from "../e2e/helpers/inbox-api-mock";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";
import { expectNoSeriousViolationsForPage } from "./helpers/axe-wcag";
import { expectHeadingLevel1, expectMainLandmark, waitAppStable } from "./helpers/page-stable";

/**
 * Product UI Pass P2 — validação automatizada de contraste e acessibilidade (axe, WCAG 2.1 AA).
 * Cobre superfícies alinhadas nos passes P0/P1 (métricas, billing, onboarding, settings, admin).
 *
 * Fluxos base (login, modal suporte) permanecem em `critical-flows.spec.ts`.
 */
test.describe("A11y — Product UI surfaces (axe, WCAG 2.1 AA)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.describe("sessão E2E (E2E_WHATSAPP_ADMIN_EMAIL / E2E_WHATSAPP_ADMIN_PASSWORD)", () => {
    test.beforeEach(async ({ context }) => {
      skipIfMissingWhatsappE2ECredentials();
      await context.clearCookies();
    });

    test("dashboard principal (/dashboard) — métricas e cartões P1", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/dashboard" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expectMainLandmark(page);
      await expectNoSeriousViolationsForPage(page, "product-ui/dashboard");
    });

    test("dashboard IA (/dashboard/ai) — painéis df-metric-* e df-status-summary-*", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/dashboard\/ai/);
      await expectHeadingLevel1(page, /IA no atendimento/i);
      await expectNoSeriousViolationsForPage(page, "product-ui/dashboard-ai");
    });

    test("inbox (/inbox) — shell P0 com mocks API", async ({ page }) => {
      const store = createDefaultInboxMockStore();
      await installInboxOperationalMocks(page, store);
      await loginAsWhatsappAdmin(page, { next: "/inbox" });
      await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 60_000 });
      await expectNoSeriousViolationsForPage(page, "product-ui/inbox");
    });

    test("billing comercial (/billing) — df-evaluation-ribbon e cartões", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/billing" });
      await waitAppStable(page);
      if (!/\/billing/.test(page.url())) {
        test.skip(
          true,
          "Billing não exposto (ex.: NEXT_PUBLIC_PRODUCT_MODE≠SAAS). Ver docs/accessibility/WCAG-AA-CHECKLIST.md."
        );
      }
      await expectNoSeriousViolationsForPage(page, "product-ui/billing");
    });

    test("dashboard billing (/dashboard/billing) — resumo de plano e uso", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/dashboard/billing" });
      await waitAppStable(page);
      if (!/\/dashboard\/billing/.test(page.url())) {
        test.skip(
          true,
          "Rota /dashboard/billing indisponível (modo white-label ou redireccionamento por role)."
        );
      }
      await expectNoSeriousViolationsForPage(page, "product-ui/dashboard-billing");
    });

    test("settings billing (/settings/billing) — contrato e df-feedback-*", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/settings/billing" });
      await waitAppStable(page);
      if (!/\/settings\/billing/.test(page.url())) {
        test.skip(
          true,
          "Settings billing indisponível (ex.: NEXT_PUBLIC_PRODUCT_MODE≠SAAS)."
        );
      }
      await expectHeadingLevel1(page, /Contrato e uso/i);
      await expectNoSeriousViolationsForPage(page, "product-ui/settings-billing");
    });

    test("onboarding (/onboarding) — df-onboarding-card e fluxo de activação", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/onboarding" });
      await waitAppStable(page);
      if (!/\/onboarding/.test(page.url())) {
        test.skip(
          true,
          "Conta E2E redireccionada fora de /onboarding (ex.: operator → /inbox ou onboarding já concluído)."
        );
      }
      await expectMainLandmark(page);
      await expectNoSeriousViolationsForPage(page, "product-ui/onboarding");
    });

    test("settings IA (/settings/ai) — formulário e df-admin-header-ring", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/settings\/ai/);
      await expectHeadingLevel1(page, /IA base do WhatsApp/i);
      await expectNoSeriousViolationsForPage(page, "product-ui/settings-ai");
    });

    test("AI analytics (/settings/ai-analytics) — métricas df-badge-* e painéis soft", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/settings/ai-analytics" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/settings\/ai-analytics/);
      await expectHeadingLevel1(page, /Uso e desempenho da IA/i);
      await expectNoSeriousViolationsForPage(page, "product-ui/settings-ai-analytics");
    });

    test("equipe (/agents) — lista e badges operacionais", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/agents" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/agents/);
      const restricted = page.getByRole("heading", { level: 1, name: /Acesso restrito/i });
      if (await restricted.isVisible().catch(() => false)) {
        test.skip(true, "Conta E2E sem permissão de gestor para /agents (canViewTeamPage).");
      }
      await expectNoSeriousViolationsForPage(page, "product-ui/agents");
    });

    test("settings gerais (/settings)", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/settings" });
      await waitAppStable(page);
      await expect(page).toHaveURL(/\/settings$/);
      await expectHeadingLevel1(page, /Configurações/i);
      await expectNoSeriousViolationsForPage(page, "product-ui/settings");
    });

    test("admin WhatsApp (/admin/whatsapp) — df-admin-header-ring", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/admin/whatsapp" });
      await waitAppStable(page);
      if (!page.url().includes("/admin/whatsapp")) {
        test.skip(
          true,
          "Redirecionado fora de /admin/whatsapp (conta E2E precisa de platform_admin)."
        );
      }
      await expectNoSeriousViolationsForPage(page, "product-ui/admin-whatsapp");
    });

    test("admin tenants (/admin/tenants) — lista plataforma", async ({ page }) => {
      await loginAsWhatsappAdmin(page, { next: "/admin/tenants" });
      await waitAppStable(page);
      if (!page.url().includes("/admin/tenants")) {
        test.skip(
          true,
          "Redirecionado fora de /admin/tenants (conta E2E precisa de platform_admin)."
        );
      }
      await expectNoSeriousViolationsForPage(page, "product-ui/admin-tenants");
    });
  });
});
