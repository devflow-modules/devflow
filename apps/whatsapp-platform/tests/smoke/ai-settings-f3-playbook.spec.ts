/**
 * Smoke visual F3 — playbook colapsado + copy workspace (PR settings-ai F3).
 */
import { expect, test } from "@playwright/test";
import { loginAsWhatsappAdmin, skipIfMissingWhatsappE2ECredentials } from "../e2e/helpers/whatsapp-auth";
import {
  AI_SETTINGS_GOAL_FIELD_LABEL,
  AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY,
} from "../../src/app/settings/ai/aiSettingsCopy";

skipIfMissingWhatsappE2ECredentials();

test.describe("F3 smoke — playbook + workspace copy", () => {
  test("playbook colapsado; objetivo workspace; sem «neste canal»", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsWhatsappAdmin(page, { next: "/settings/ai" });
    await expect(page).toHaveURL(/\/settings\/ai/);

    await page.locator("#comportamento").scrollIntoViewIfNeeded();

    await expect(page.getByText("neste canal")).toHaveCount(0);
    await expect(page.getByLabel(AI_SETTINGS_GOAL_FIELD_LABEL)).toBeVisible();

    const playbook = page.locator("details").filter({ hasText: AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY });
    await expect(playbook).toHaveCount(1);
    await expect(playbook).not.toHaveAttribute("open");
    await expect(page.locator("#pb-goal-lead")).not.toBeVisible();
  });
});
