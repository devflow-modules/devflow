import { expect, test, type Page } from "@playwright/test";

export function getE2EWhatsappAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_WHATSAPP_ADMIN_EMAIL?.trim() ?? "";
  const password = process.env.E2E_WHATSAPP_ADMIN_PASSWORD?.trim() ?? "";
  if (!email || !password) return null;
  return { email, password };
}

/** Skip de suite se variáveis não estiverem definidas (igual ao onboarding). */
export function skipIfMissingWhatsappE2ECredentials(): void {
  const c = getE2EWhatsappAdminCredentials();
  test.skip(!c, "Defina E2E_WHATSAPP_ADMIN_EMAIL e E2E_WHATSAPP_ADMIN_PASSWORD no ambiente");
}

/**
 * Login com credenciais E2E e garante rota final em `/inbox` (ou `next` pedido).
 * Aceita redirecionamento intermédio (dashboard/onboarding).
 */
export async function loginAsWhatsappAdmin(page: Page, opts?: { next?: string }): Promise<void> {
  const c = getE2EWhatsappAdminCredentials();
  if (!c) throw new Error("Credenciais E2E em falta");
  const next = opts?.next ?? "/inbox";
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(c.email);
  await page.getByLabel("Senha").fill(c.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  const target = new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  try {
    await page.waitForURL(target, { timeout: 60_000 });
  } catch {
    await page.goto(next);
    await expect(page).toHaveURL(target, { timeout: 30_000 });
  }
}
