import { expect, type Page } from "@playwright/test";

/** Evitar `networkidle` no `next dev` (HMR / pedidos longos — nunca fica “idle”). */
export async function waitAppStable(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
}

export async function expectMainLandmark(page: Page): Promise<void> {
  await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });
}

export async function expectHeadingLevel1(page: Page, name: RegExp | string): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({ timeout: 30_000 });
}
