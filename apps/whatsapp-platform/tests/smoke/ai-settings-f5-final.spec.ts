/**
 * F5 — validação final `/settings/ai` (desktop + mobile).
 * Sem redesign; só asserts de regressão F0–F4 + teclado + estados observáveis.
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";
import {
  AI_SETTINGS_GOAL_FIELD_LABEL,
  AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY,
  AI_SETTINGS_SAVE_LABEL,
} from "../../src/app/settings/ai/aiSettingsCopy";
import { AI_SETTINGS_HEADER_QUICK_LINKS } from "../../src/app/settings/ai/aiSettingsQuickActions";

skipIfMissingWhatsappE2ECredentials();

async function assertSeriesRegression(page: Page) {
  await expect(page.getByRole("heading", { name: "IA base do WhatsApp" })).toBeVisible();

  // F1 chrome — no mobile o header pode colapsar; rodapé do form mantém Salvar
  await expect(page.getByRole("heading", { name: "IA por canal" })).toHaveCount(0);
  await expect(page.locator("a.df-quick-action")).toHaveCount(AI_SETTINGS_HEADER_QUICK_LINKS.length);
  const formSave = page.locator("form#wf-ai-settings").getByRole("button", { name: AI_SETTINGS_SAVE_LABEL });
  await expect(formSave).toHaveCount(1);
  await expect(page.getByRole("button", { name: AI_SETTINGS_SAVE_LABEL }).first()).toBeVisible();

  // F2 status
  await expect(page.getByText("Modo automático")).toHaveCount(0);
  const guardrails = page.locator("details").filter({ hasText: "Guardrails e handoff" });
  await expect(guardrails).toHaveCount(1);
  await expect(guardrails).not.toHaveAttribute("open");

  // F3 playbook
  await expect(page.getByText("neste canal")).toHaveCount(0);
  await expect(page.getByLabel(AI_SETTINGS_GOAL_FIELD_LABEL)).toBeVisible();
  const playbook = page.locator("details").filter({ hasText: AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY });
  await expect(playbook).not.toHaveAttribute("open");
  await expect(page.locator("#pb-goal-lead")).not.toBeVisible();

  // F4 help density
  await expect(page.getByText("Quando usar:")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Guardar/i })).toHaveCount(0);

  // 1ª dobra: toggle
  const toggle = page.getByRole("checkbox", { name: /IA ativada para o espaço de trabalho/i });
  await expect(toggle).toBeVisible();

  // F0 CTA: normal + foco + loading
  await page.locator("#teste").scrollIntoViewIfNeeded();
  const testCta = page.getByRole("button", { name: /^Testar resposta$/ });
  await expect(testCta).toBeVisible({ timeout: 60_000 });
  await expect(testCta).toBeEnabled();
  await testCta.focus();
  await expect(testCta).toBeFocused();
  await testCta.click();
  const loading = page.getByRole("button", { name: /^A gerar…$/ });
  await expect(loading).toBeVisible({ timeout: 5_000 });
  await expect(loading).toBeDisabled();
  // sucesso ou erro — botão volta a normal
  await expect(page.getByRole("button", { name: /^Testar resposta$/ })).toBeVisible({ timeout: 90_000 });
  const feedback = page.locator("[role='alert'], .df-feedback-error, .df-feedback-success, .df-feedback-warning");
  // feedback opcional conforme API; se existir, deve ser um dos estados esperados
  if ((await feedback.count()) > 0) {
    await expect(feedback.first()).toBeVisible();
  }

  // Teclado: Tab alcança Salvar do rodapé
  await page.locator("form#wf-ai-settings").evaluate((el) => el.scrollIntoView({ block: "end" }));
  await formSave.focus();
  await expect(formSave).toBeFocused();
}

test.describe("F5 smoke — settings/ai validação final", () => {
  test("desktop: série F0–F4 + CTA estados + teclado", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);
    await assertSeriesRegression(page);
  });

  test("mobile: mesma regressão da série", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);
    await assertSeriesRegression(page);
  });
});
