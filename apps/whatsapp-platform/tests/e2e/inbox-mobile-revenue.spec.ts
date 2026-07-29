import { expect, test, devices } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "./helpers/whatsapp-auth";
import {
  createDefaultInboxMockStore,
  installInboxOperationalMocks,
} from "./helpers/inbox-api-mock";

/**
 * Smoke mobile + superfície de registo de resultado (UI).
 * iPhone 12 ≈ 390×844; viewport Android comum 360.
 * Fatia 5: copy alinhado a “Registrar resultado…” / “Fechou venda” (não “Fechar venda”).
 */
test.describe("Inbox mobile + venda", () => {
  test.beforeEach(async ({ context }) => {
    skipIfMissingWhatsappE2ECredentials();
    await context.clearCookies();
  });

  test("iPhone 12 — inbox, chat e bloco de venda visível (manager)", async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices["iPhone 12"] });
    const page = await ctx.newPage();
    const store = createDefaultInboxMockStore();
    await installInboxOperationalMocks(page, store);
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await expect(page.getByTestId("chat-window")).toBeVisible();
    await expect(page.getByRole("button", { name: /Voltar/i })).toBeVisible();
    await expect(page.getByTestId("message-input")).toBeVisible();
    // Fatia 3 KEEP removeu a grelha mobile “Responder”; composer densificado + DealClose (Fatia 5).
    await expect(page.locator("#inbox-deal-close")).toBeVisible();
    await expect(page.getByText("Registrar resultado (ganho ou perda)")).toBeVisible();
    await ctx.close();
  });

  test("Android 360 — abrir registo de resultado e âncora deal", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await ctx.newPage();
    const store = createDefaultInboxMockStore();
    await installInboxOperationalMocks(page, store);
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    const dealAnchor = page.locator("#inbox-deal-close");
    await expect(dealAnchor).toBeVisible();
    await page.getByText("Registrar resultado (ganho ou perda)").click();
    await expect(page.getByRole("button", { name: "Fechou venda" })).toBeVisible();
    await ctx.close();
  });
});
