import { expect, test, type Page } from "@playwright/test";
import { loginUrlWithNext } from "../../../src/lib/safe-redirect";
import {
  getE2EWhatsappAdminCredentials,
  hasWhatsappE2ECredentials,
} from "./whatsapp-auth-state.mts";

export {
  AUTH_STORAGE_STATE_PATH,
  getE2EBaseURL,
  getE2EWhatsappAdminCredentials,
  hasWhatsappE2ECredentials,
  isLocalE2EBaseURL,
} from "./whatsapp-auth-state.mts";

/** Skip de suite se variáveis não estiverem definidas (igual ao onboarding). */
export function skipIfMissingWhatsappE2ECredentials(): void {
  test.skip(!hasWhatsappE2ECredentials(), "Defina E2E_WHATSAPP_ADMIN_EMAIL e E2E_WHATSAPP_ADMIN_PASSWORD no ambiente");
}

/**
 * Login com credenciais E2E e garante rota final em `/inbox` (ou `next` pedido).
 * Aceita redirecionamento intermédio (dashboard/onboarding).
 */
export async function loginAsWhatsappAdmin(page: Page, opts?: { next?: string }): Promise<void> {
  const c = getE2EWhatsappAdminCredentials();
  if (!c) throw new Error("Credenciais E2E em falta");
  const next = opts?.next ?? "/inbox";
  await page.goto(loginUrlWithNext(next));
  await page.getByLabel("E-mail").fill(c.email);
  await page.getByLabel("Senha").fill(c.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  const target = new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\?|$)`);
  try {
    await page.waitForURL(target, { timeout: 60_000 });
  } catch {
    await page.goto(next);
    await expect(page).toHaveURL(target, { timeout: 30_000 });
  }
}

/**
 * Navega para `next` reutilizando `storageState` quando disponível.
 * Se a sessão expirou (redirect para `/login`), faz login completo.
 */
export async function navigateAsWhatsappAdmin(page: Page, opts?: { next?: string }): Promise<void> {
  const next = opts?.next ?? "/inbox";
  await page.goto(next);

  const target = new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\?|$)`);
  if (target.test(page.url())) return;

  if (/\/login/.test(page.url())) {
    await loginAsWhatsappAdmin(page, { next });
    return;
  }

  await page.goto(next);
  await expect(page).toHaveURL(target, { timeout: 30_000 });
}
