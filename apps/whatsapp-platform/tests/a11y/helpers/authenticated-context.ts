import { test } from "@playwright/test";
import { AUTH_STORAGE_STATE_PATH, skipIfMissingWhatsappE2ECredentials } from "../../e2e/helpers/whatsapp-auth";

/**
 * Configura suite a11y autenticada: reutiliza `storageState` do global setup
 * e skip explícito quando credenciais E2E não existem.
 */
export function useAuthenticatedA11yContext(): void {
  test.use({ storageState: AUTH_STORAGE_STATE_PATH });
  test.beforeEach(() => {
    skipIfMissingWhatsappE2ECredentials();
  });
}
