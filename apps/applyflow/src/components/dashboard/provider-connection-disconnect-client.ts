import type { ProviderConnectionDisconnectResult, ProviderKind } from "@devflow/career-sync";

/**
 * Client-safe provider disconnect fetch helper.
 * Sends provider and explicit confirmation only — no secrets, tokens, or connection IDs.
 */

export const PROVIDER_CONNECTION_DISCONNECT_URL = "/provider-runtime/nango/disconnect";

export async function fetchProviderConnectionDisconnect(
  provider: ProviderKind,
  explicitConfirmation: true,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderConnectionDisconnectResult> {
  const response = await fetchImpl(PROVIDER_CONNECTION_DISCONNECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      explicitConfirmation,
    }),
  });

  if (!response.ok && response.status >= 500) {
    throw new Error(`Disconnect request failed with status ${response.status}`);
  }

  return (await response.json()) as ProviderConnectionDisconnectResult;
}

export async function runProviderConnectionDisconnect(input: {
  provider: ProviderKind;
  explicitConfirmation: true;
  fetchImpl?: typeof fetch;
}): Promise<ProviderConnectionDisconnectResult> {
  return fetchProviderConnectionDisconnect(
    input.provider,
    input.explicitConfirmation,
    input.fetchImpl,
  );
}

export function isProviderDisconnectUiEnabled(input: {
  explicitConsentChecked: boolean;
  isDisconnecting: boolean;
  uiState: string;
}): boolean {
  if (!input.explicitConsentChecked || input.isDisconnecting) {
    return false;
  }

  return input.uiState === "idle" || input.uiState === "disconnected" || input.uiState === "error";
}
