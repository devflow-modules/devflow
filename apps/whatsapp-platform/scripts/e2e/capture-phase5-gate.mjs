import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/experiments/evidence/inbox-banner-dealclose-phase5-gate"
);
const url = `file:///${path.join(dir, "harness.html").replace(/\\/g, "/")}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
await page.goto(url);

async function shot(name, scene, mode = "after", vp = "desk") {
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator(`[data-scene="${scene}"]`).click();
  await page.locator(`[data-vp="${vp}"]`).click();
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(dir, name), fullPage: true });
}

await shot("01-after-waiting-no-banner.png", "waiting", "after", "desk");
await shot("02-before-waiting-banner.png", "waiting", "before", "desk");
await shot("03-after-high-compact.png", "high", "after", "desk");
await shot("04-after-deal-details.png", "open", "after", "desk");
await shot("05-after-pending.png", "pending", "after", "desk");
await shot("06-after-won.png", "won", "after", "desk");
await shot("07-after-closed-r1.png", "closed", "after", "desk");
await shot("08-mobile-after-waiting.png", "waiting", "after", "mobile");
await browser.close();
console.log("shots ok", dir);
