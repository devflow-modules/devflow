/**
 * Smoke visual F2 — status/billing strip em /settings/ai (PR #186).
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=http://127.0.0.1:3099 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     npx playwright test tests/smoke/ai-settings-f2-status.spec.ts
 */
import { expect, test } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

test.describe("F2 smoke — settings/ai status/billing", () => {
  test("caminho principal: sem Modo, Guardrails colapsado, ≤1 faixa comercial", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);

    await expect(page.getByRole("heading", { name: "IA base do WhatsApp" })).toBeVisible();
    await expect(page.getByLabel("Estado operacional da IA")).toBeVisible();

    // Sem badge «Modo» derivado
    await expect(page.getByText("Modo automático")).toHaveCount(0);
    await expect(page.getByText("Modo assistido")).toHaveCount(0);
    await expect(page.getByText("Modo inativo")).toHaveCount(0);

    // Guardrails colapsado
    const guardrails = page.locator("details").filter({ hasText: /^Guardrails e handoff/ });
    await expect(guardrails).toHaveCount(1);
    await expect(guardrails).not.toHaveAttribute("open");
    await expect(page.getByText("Quando a IA pode responder:")).not.toBeVisible();

    // PricingContextHint: só permitido dentro de details fechados (avançado) — zero visíveis no caminho principal
    const pricingHintLinks = page.locator(
      'div.rounded-lg.border.df-border-brand a[href="/dashboard/billing"]',
    );
    let visibleHints = 0;
    const n = await pricingHintLinks.count();
    for (let i = 0; i < n; i++) {
      if (await pricingHintLinks.nth(i).isVisible()) visibleHints += 1;
    }
    expect(visibleHints).toBeLessThanOrEqual(1);

    // Details de avançado também fechado (hint ADVANCED_AI não no caminho principal)
    const advanced = page.locator("details").filter({ hasText: "Avançado — motor LLM" });
    if ((await advanced.count()) > 0) {
      await expect(advanced.first()).not.toHaveAttribute("open");
      await expect(advanced.first().locator('a[href="/dashboard/billing"]')).not.toBeVisible();
    }

    // Regressão leve F0/F1: Salvar primary + CTA teste
    await expect(page.getByRole("button", { name: "Salvar alterações" }).first()).toHaveClass(/df-btn-primary/);
    await page.locator("#teste").scrollIntoViewIfNeeded();
    const testCta = page.getByRole("button", { name: /^Testar resposta$/ });
    await expect(testCta).toBeVisible({ timeout: 60_000 });
    await expect(testCta).toBeEnabled();
  });
});
