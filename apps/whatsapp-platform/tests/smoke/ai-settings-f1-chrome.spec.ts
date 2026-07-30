/**
 * Smoke visual F1 — chrome da 1ª dobra em /settings/ai (PR #184).
 * Não amplía para F2 (pricing/badges/guardrails).
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=http://127.0.0.1:3099 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     npx playwright test tests/smoke/ai-settings-f1-chrome.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

async function assertFirstFoldChrome(page: Page) {
  await expect(page.getByRole("heading", { name: "IA base do WhatsApp" })).toBeVisible();

  // Header curto — sem o parágrafo longo com 3 links inline de motor/analytics/painel
  await expect(page.getByRole("link", { name: "Configurações gerais" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Uso e desempenho" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Análises de IA" })).toHaveCount(0);

  // Ausência dos blocos cortados na F1
  await expect(page.getByRole("heading", { name: "IA por canal" })).toHaveCount(0);
  await expect(page.getByText("Ordem sugerida de configuração")).toHaveCount(0);
  await expect(page.getByText("Uso e custo de IA")).toHaveCount(0);
  await expect(page.getByText("Painel IA no atendimento")).toHaveCount(0);

  // Toggle IA compreensível
  const toggle = page.getByRole("checkbox", { name: /IA ativada para o espaço de trabalho/i });
  await expect(toggle).toBeVisible();

  // Salvar prioritário + exactamente 2 links secundários no header (df-quick-action)
  const save = page.getByRole("button", { name: "Salvar alterações" }).first();
  await expect(save).toBeVisible();
  await expect(save).toHaveClass(/df-btn-primary/);

  const quickLinks = page.locator("a.df-quick-action");
  await expect(quickLinks).toHaveCount(2);
  await expect(quickLinks.nth(0)).toHaveText("Ir para teste");
  await expect(quickLinks.nth(1)).toHaveText("Gerenciar canais");

  // Regressão F0 — CTA Testar resposta primary/enabled (fora do loading)
  await page.locator("#teste").scrollIntoViewIfNeeded();
  const testCta = page.getByRole("button", { name: /^Testar resposta$/ });
  await expect(testCta).toBeVisible({ timeout: 60_000 });
  await expect(testCta).toBeEnabled();
  const testClass = await testCta.getAttribute("class");
  expect(testClass ?? "").toMatch(/df-btn-primary/);
  expect(testClass ?? "").not.toMatch(/df-btn-disabled/);
}

test.describe("F1 smoke — settings/ai chrome 1ª dobra", () => {
  test("desktop: header curto, toggle, Salvar, 2 links, sem chrome F1, CTA F0 ok", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);
    await assertFirstFoldChrome(page);
  });

  test("mobile: mesmos gates da 1ª dobra", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);
    await assertFirstFoldChrome(page);
  });
});
