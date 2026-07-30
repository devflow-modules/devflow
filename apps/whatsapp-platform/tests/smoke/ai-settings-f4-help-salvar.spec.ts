/**
 * Smoke F4 — Salvar unificado; sem «Guardar»; sem «Quando usar:» no caminho principal.
 */
import { expect, test } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";
import { AI_SETTINGS_SAVE_LABEL } from "../../src/app/settings/ai/aiSettingsCopy";

skipIfMissingWhatsappE2ECredentials();

test.describe("F4 smoke — FieldHelp + Salvar", () => {
  test("Salvar no header e rodapé; zero Guardar; sem Quando usar:", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);

    const saves = page.getByRole("button", { name: AI_SETTINGS_SAVE_LABEL });
    await expect(saves).toHaveCount(2);
    await expect(page.getByRole("button", { name: /Guardar/i })).toHaveCount(0);
    await expect(page.getByText("Quando usar:")).toHaveCount(0);
    await expect(page.getByText(/^Impacto:/)).toHaveCount(0);
  });
});
