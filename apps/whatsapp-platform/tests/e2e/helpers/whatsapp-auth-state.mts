import path from "node:path";
import { fileURLToPath } from "node:url";

const helperDir = path.dirname(fileURLToPath(import.meta.url));

/** Ficheiro gerado por `tests/setup/global-auth.setup.mts` — não commitar. */
export const AUTH_STORAGE_STATE_PATH =
  process.env.E2E_AUTH_STORAGE_STATE_PATH?.trim() ||
  path.join(helperDir, "../../.auth/whatsapp-admin.json");

export function getE2EWhatsappAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_WHATSAPP_ADMIN_EMAIL?.trim() ?? "";
  const password = process.env.E2E_WHATSAPP_ADMIN_PASSWORD?.trim() ?? "";
  if (!email || !password) return null;
  return { email, password };
}

export function hasWhatsappE2ECredentials(): boolean {
  return getE2EWhatsappAdminCredentials() !== null;
}

/**
 * Base URL dos testes Playwright.
 * Preferência: `E2E_WHATSAPP_BASE_URL` → `E2E_BASE_URL` → dev local.
 */
export function getE2EBaseURL(): string {
  return (
    process.env.E2E_WHATSAPP_BASE_URL?.trim() ||
    process.env.E2E_BASE_URL?.trim() ||
    "http://127.0.0.1:3099"
  );
}

export function isLocalE2EBaseURL(url = getE2EBaseURL()): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}
