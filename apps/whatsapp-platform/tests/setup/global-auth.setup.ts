import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginUrlWithNext } from "../../src/lib/safe-redirect";
import {
  AUTH_STORAGE_STATE_PATH,
  getE2EBaseURL,
  getE2EWhatsappAdminCredentials,
} from "../e2e/helpers/whatsapp-auth";

async function globalSetup(_config: FullConfig): Promise<void> {
  fs.mkdirSync(path.dirname(AUTH_STORAGE_STATE_PATH), { recursive: true });

  const creds = getE2EWhatsappAdminCredentials();
  if (!creds) {
    console.log(
      "[e2e:auth] Sem E2E_WHATSAPP_ADMIN_EMAIL/PASSWORD — storageState vazio; rotas autenticadas serão skipped."
    );
    fs.writeFileSync(AUTH_STORAGE_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const baseURL = getE2EBaseURL();
  console.log(`[e2e:auth] Login único (${baseURL}) → ${AUTH_STORAGE_STATE_PATH}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto(loginUrlWithNext("/inbox"));
  await page.getByLabel("E-mail").fill(creds.email);
  await page.getByLabel("Senha").fill(creds.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(inbox|dashboard|onboarding)(\?|$)/, { timeout: 90_000 });

  await context.storageState({ path: AUTH_STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
