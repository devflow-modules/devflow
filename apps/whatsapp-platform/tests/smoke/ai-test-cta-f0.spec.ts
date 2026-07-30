/**
 * Smoke visual F0 — CTA «Testar resposta» em /settings/ai (PR #182).
 * Não commitar credenciais; lê E2E_* do ambiente.
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=https://…vercel.app npx playwright test tests/smoke/ai-test-cta-f0.spec.ts
 */
import { expect, test } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

test.describe("F0 smoke — Testar resposta CTA", () => {
  test("estados normal, hover, foco, loading/disabled", async ({ page }) => {
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);

    // Scroll até a secção de teste
    await page.locator("#teste").scrollIntoViewIfNeeded();

    const btn = page.getByRole("button", { name: /^Testar resposta$/ });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await expect(btn).toBeEnabled();

    // Normal — variante primary (não disabled)
    const classNormal = await btn.getAttribute("class");
    expect(classNormal ?? "").toMatch(/df-btn-primary/);
    expect(classNormal ?? "").not.toMatch(/df-btn-disabled/);

    // Hover
    await btn.hover();
    await expect(btn).toBeEnabled();

    // Foco
    await btn.focus();
    await expect(btn).toBeFocused();

    // Loading / disabled real — clique inicia simulação
    await btn.click();
    const loadingBtn = page.getByRole("button", { name: /^A gerar…$/ });
    await expect(loadingBtn).toBeVisible({ timeout: 5_000 });
    await expect(loadingBtn).toBeDisabled();
    const classLoading = await loadingBtn.getAttribute("class");
    expect(classLoading ?? "").toMatch(/df-btn-disabled|opacity-50|pointer-events-none/);

    // Volta a normal após a simulação (sucesso ou erro de API)
    await expect(page.getByRole("button", { name: /^Testar resposta$/ })).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByRole("button", { name: /^Testar resposta$/ })).toBeEnabled();
  });
});
