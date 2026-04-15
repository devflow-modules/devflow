import { expect, test } from "@playwright/test";
import {
  createDefaultInboxMockStore,
  installInboxOperationalMocks,
  type InboxMockStore,
} from "./helpers/inbox-api-mock";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "./helpers/whatsapp-auth";

async function setupInboxPage(page: import("@playwright/test").Page, store: InboxMockStore) {
  await installInboxOperationalMocks(page, store);
  await loginAsWhatsappAdmin(page, { next: "/inbox" });
  await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("conversations-list")).toBeVisible({ timeout: 60_000 });
}

test.describe("Inbox operacional", () => {
  test.beforeEach(async ({ context }) => {
    skipIfMissingWhatsappE2ECredentials();
    await context.clearCookies();
  });

  test("abre inbox e lista conversas (mocks API)", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await expect(page.getByTestId("conversation-item")).toHaveCount(2);
  });

  test("seleciona conversa e mostra chat + estado", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await expect(page.getByTestId("chat-window")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cliente Alfa" })).toBeVisible();
    await expect(page.getByTestId("chat-header-state-badge")).toContainText("Precisa resposta");
  });

  test("envia mensagem e aparece na timeline", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await expect(page.getByTestId("message-list")).toBeVisible();
    const body = `Mensagem E2E ${Date.now()}`;
    await page.locator("#inbox-composer").fill(body);
    await page.getByTestId("send-button").click();
    await expect(page.getByTestId("message-list")).toContainText(body, { timeout: 20_000 });
  });

  test("assume conversa (header)", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await expect(page.getByTestId("header-assume")).toBeVisible();
    await page.getByTestId("header-assume").click();
    await expect(page.getByTestId("header-release")).toBeVisible({ timeout: 15_000 });
  });

  test("altera estado da thread para Pendente (Gestão)", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    const header = page.locator(".df-inbox-header");
    await header.getByTestId("header-thread-status-trigger").click();
    await page.getByTestId("header-thread-status-PENDING").click();
    await expect(header.getByText("Pendente").first()).toBeVisible();
  });

  test("painel lateral (lead) visível com score", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await expect(page.getByTestId("lead-panel")).toBeVisible();
    await expect(page.getByTestId("lead-score")).toHaveText("72");
    await expect(page.getByTestId("lead-score-bar")).toBeVisible();
  });

  test("falha de envio mostra aviso e retry", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    store.sendShouldFailOnce = true;
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await page.locator("#inbox-composer").fill("vai falhar");
    await page.getByTestId("send-button").click();
    await expect(page.getByText("Não enviámos a mensagem.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Tentar novamente/i })).toBeVisible();
  });

  test("troca de conversa atualiza o cabeçalho", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await expect(page.getByRole("heading", { name: "Cliente Alfa" })).toBeVisible();
    await page.getByRole("button", { name: /Cliente Beta/i }).click();
    await expect(page.getByRole("heading", { name: "Cliente Beta" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cliente Alfa" })).not.toBeVisible();
  });

  test("encerrar e reabrir reflete no badge de estado", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await page.getByTestId("header-close").click();
    await expect(page.getByTestId("chat-header-state-badge")).toContainText("Encerrada");
    await page.getByTestId("inbox-filter-closed").click();
    await expect(page.getByRole("button", { name: /Cliente Alfa/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await page.getByTestId("header-reopen").click();
    await expect(page.getByTestId("chat-header-state-badge")).toContainText("Precisa resposta");
    await page.getByTestId("inbox-filter-needs_response").click();
    await expect(page.getByRole("button", { name: /Cliente Alfa/i })).toBeVisible();
  });
});

test.describe("Inbox smoke mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ context }) => {
    skipIfMissingWhatsappE2ECredentials();
    await context.clearCookies();
  });

  test("lista e abre conversa", async ({ page }) => {
    const store = createDefaultInboxMockStore();
    await setupInboxPage(page, store);
    await expect(page.getByTestId("conversations-list")).toBeVisible();
    await page.getByRole("button", { name: /Cliente Alfa/i }).click();
    await expect(page.getByTestId("chat-window")).toBeVisible();
    await expect(page.getByTestId("message-input")).toBeVisible();
  });
});
