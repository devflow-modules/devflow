/**
 * Smoke visual UI-1a — tokens df-* em sugestão, presença e status de agente.
 *
 * Uso:
 *   E2E_WHATSAPP_BASE_URL=http://127.0.0.1:3099 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     corepack pnpm exec playwright test tests/smoke/inbox-ui1a-tokens.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";

skipIfMissingWhatsappE2ECredentials();

const LIGHT_PALETTE = /(sky-50|emerald-50|red-50|bg-emerald-50|bg-sky-50|bg-red-50)/;

test.describe.configure({ timeout: 90_000 });

async function openMetricsPanel(page: Page) {
  const details = page.getByTestId("inbox-metrics-details");
  await expect(details).toBeAttached({ timeout: 30_000 });
  const open = await details.evaluate((el) => (el as HTMLDetailsElement).open);
  if (!open) {
    await details.locator("summary").click();
  }
  await expect(page.getByTestId("inbox-metrics-panel")).toBeVisible({ timeout: 15_000 });
}

async function openFirstConversationIfAny(page: Page): Promise<boolean> {
  const items = page.getByTestId("conversation-item");
  const count = await items.count();
  if (count === 0) return false;
  await items.first().click();
  return true;
}

async function assertNoLightPalette(page: Page, testId: string) {
  const el = page.getByTestId(testId);
  if ((await el.count()) === 0) return;
  const className = await el.first().getAttribute("class");
  expect(className ?? "", `${testId} não deve usar paleta clara improvisada`).not.toMatch(LIGHT_PALETTE);
}

test.describe("UI-1a smoke — inbox tokens dark", () => {
  test("desktop: inbox autenticado + tokens em sugestão/presença/status", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await expect(page).toHaveURL(/\/inbox/, { timeout: 60_000 });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 30_000 });

    await openMetricsPanel(page);
    const metrics = page.getByTestId("inbox-metrics-panel");

    const statusBadges = metrics.locator(".df-badge-success, .df-badge-danger, .df-badge-muted");
    const badgeCount = await statusBadges.count();
    if (badgeCount > 0) {
      await expect(statusBadges.first()).toBeVisible();
      const firstClass = (await statusBadges.first().getAttribute("class")) ?? "";
      expect(firstClass).not.toMatch(LIGHT_PALETTE);
      expect(firstClass).toMatch(/df-badge-(success|danger|muted)/);
    }

    await assertNoLightPalette(page, "inbox-online-users-badge");
    const online = page.getByTestId("inbox-online-users-badge");
    if ((await online.count()) > 0) {
      await expect(online).toHaveClass(/df-badge-success/);
    }

    const opened = await openFirstConversationIfAny(page);
    test.info().annotations.push({
      type: "note",
      description: opened ? "conversa aberta" : "lista vazia — sugestão não verificável",
    });

    if (opened) {
      const proxima = page.getByRole("tab", { name: /Próxima ação/i }).or(page.getByRole("button", { name: /Próxima ação/i }));
      if ((await proxima.count()) > 0) {
        await proxima.first().click();
      }
      await assertNoLightPalette(page, "operator-suggestion");
      const suggestion = page.getByTestId("operator-suggestion");
      if ((await suggestion.count()) > 0) {
        await expect(suggestion).toHaveClass(/df-feedback-info/);
      }
    }
  });

  test("mobile: inbox autenticado sem paleta clara residual nos alvos", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsWhatsappAdmin(page, { next: "/inbox" });
    await expect(page).toHaveURL(/\/inbox/, { timeout: 60_000 });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 30_000 });

    await openMetricsPanel(page);
    await assertNoLightPalette(page, "inbox-online-users-badge");

    const opened = await openFirstConversationIfAny(page);
    if (opened) {
      await assertNoLightPalette(page, "operator-suggestion");
    }
  });

  test("agents: AgentStatusBadge compartilhado usa df-badge-*", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/agents" });
    await expect(page).toHaveURL(/\/agents/, { timeout: 60_000 });

    const badges = page.locator(".df-badge-success, .df-badge-danger, .df-badge-muted");
    await expect(badges.first()).toBeVisible({ timeout: 30_000 });
    const className = (await badges.first().getAttribute("class")) ?? "";
    expect(className).toMatch(/df-badge-(success|danger|muted)/);
    expect(className).not.toMatch(LIGHT_PALETTE);
  });
});
