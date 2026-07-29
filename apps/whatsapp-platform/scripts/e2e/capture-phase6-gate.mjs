import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/experiments/evidence/inbox-shell-chrome-phase6-gate"
);
const url = `file:///${path.join(dir, "harness.html").replace(/\\/g, "/")}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 980, height: 760 } });
await page.goto(url);

async function shot(name, scene, mode = "after", vp = "desk") {
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator(`[data-scene="${scene}"]`).click();
  await page.locator(`[data-vp="${vp}"]`).click();
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(dir, name), fullPage: true });
}

await shot("01-after-default-list-first.png", "default", "after", "desk");
await shot("02-before-default-chrome-heavy.png", "default", "before", "desk");
await shot("03-after-metrics-open.png", "metrics-open", "after", "desk");
await shot("04-after-focus.png", "focus", "after", "desk");
await shot("05-mobile-after-default.png", "default", "after", "mobile");
await shot("06-mobile-before-default.png", "default", "before", "mobile");
await browser.close();
console.log("shots ok", dir);
