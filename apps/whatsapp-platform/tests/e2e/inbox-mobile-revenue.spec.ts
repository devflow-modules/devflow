import { expect, test, devices } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "./helpers/whatsapp-auth";
import {
  createDefaultInboxMockStore,
  installInboxOperationalMocks,
} from "./helpers/inbox-api-mock";

/**
 * Smoke mobile + superfície de fecho de venda (UI).
 * iPhone 12 ≈ 390×844; viewport Android comum 360.
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
    await expect(page.getByRole("button", { name: "Responder" })).toBeVisible();
    await expect(page.getByText("Fechar venda").first()).toBeVisible();
    await ctx.close();
  });

  test("Android 360 — ações rápidas e scroll até fecho", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await ctx.newPage();
    const store = createDefaultInboxMockStore();
    await installInboxOperationalMocks(page, store);
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await page.getByRole("button", { name: "Fechar venda" }).first().click();
    const dealAnchor = page.locator("#inbox-deal-close");
    if ((await dealAnchor.count()) > 0) {
      await expect(dealAnchor).toBeVisible();
    }
    await ctx.close();
  });
});
