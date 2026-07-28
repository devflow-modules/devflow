import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  createIsolationEvidence,
  initializeSafeStorageState,
  writeIsolationShard,
} from "../../scripts/e2e/inbox-e2e-artifacts";
import {
  AUTH_STORAGE_STATE_PATH,
  getE2EBaseURL,
  getE2EWhatsappAdminCredentials,
} from "../e2e/helpers/whatsapp-auth-state.mts";

async function globalSetup(): Promise<void> {
  if (process.env.INBOX_E2E_SAFE_MODE === "1") {
    const runId = process.env.INBOX_E2E_ATTEMPT_ID?.trim() ?? "";
    initializeSafeStorageState(AUTH_STORAGE_STATE_PATH, runId);
    const evidence = createIsolationEvidence();
    evidence.complete = true;
    writeIsolationShard(runId, "global-setup", evidence);
    console.log("[e2e:auth] Storage state efêmero inicializado pelo runner seguro");
    return;
  }

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
  console.log("[e2e:auth] Login único com storage state efêmero");

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(creds.email);
  await page.getByLabel("Senha").fill(creds.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(inbox|dashboard|onboarding)(\?|$)/, { timeout: 90_000 });

  await context.storageState({ path: AUTH_STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
