/**
 * Smoke F3 — links de conversa + copy PT em /dashboard/ai (#200).
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=http://127.0.0.1:3099 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     npx playwright test tests/smoke/dashboard-ai-f3-events.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

const FIXTURE_THREAD = "smoke-f3-thread-abc";

async function installLogsFixture(page: Page) {
  await page.route("**/api/ai/logs**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            type: "auto_reply",
            reason: "F3 smoke — evento com conversa",
            createdAt: new Date().toISOString(),
            conversationId: FIXTURE_THREAD,
          },
          {
            type: "fallback",
            reason: "F3 smoke — evento sem conversa",
            createdAt: new Date().toISOString(),
            conversationId: null,
          },
        ],
      }),
    });
  });
}

async function assertF3Surface(page: Page) {
  await expect(page.getByTestId("dashboard-ai-page")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Prioridades" })).toBeVisible();

  // Copy funil PT (progressive disclosure F2)
  const advanced = page.getByTestId("dashboard-ai-advanced-metrics");
  await advanced.locator("> summary").click();
  const funnel = page.getByTestId("dashboard-ai-funnel");
  await expect(funnel).toBeVisible();
  await expect(funnel).toContainText("Qualificação");
  await expect(funnel).toContainText("Negociação");
  await expect(funnel).toContainText("Fechado");
  await expect(funnel).toContainText("Suporte");
  const funnelText = await funnel.innerText();
  expect(funnelText).not.toMatch(/\bQualifying\b/);
  expect(funnelText).not.toMatch(/\bNegotiating\b/);
  expect(funnelText).not.toMatch(/\bClosed\b/);
  expect(funnelText).not.toMatch(/\bSupport\b/);

  // Link de conversa + fallback sem conversa
  const link = page.getByTestId("dashboard-ai-event-conversation-link").first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", `/inbox?thread=${FIXTURE_THREAD}`);
  await expect(link).toHaveAttribute("aria-label", new RegExp(`Abrir conversa.*${FIXTURE_THREAD.slice(0, 12)}`));

  await expect(page.getByLabel("Sem conversa associada")).toBeVisible();

  // Abrir conversa correta
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/inbox\\?thread=${FIXTURE_THREAD}`));
}

test.describe("F3 smoke — dashboard/ai eventos → Inbox", () => {
  test.describe.configure({ timeout: 90_000 });

  test("desktop: link conversa, fallback, copy PT", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await installLogsFixture(page);
    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await assertF3Surface(page);
  });

  test("mobile: mesmos gates", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installLogsFixture(page);
    await loginAsWhatsappAdmin(page, { next: "/dashboard/ai" });
    await expect(page).toHaveURL(/\/dashboard\/ai/);
    await assertF3Surface(page);
  });
});
