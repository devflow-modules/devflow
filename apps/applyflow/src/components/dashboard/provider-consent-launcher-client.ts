import type { ProviderKind } from "@devflow/career-sync";
import type { ApplyFlowNangoConnectLauncherResponse } from "@/lib/provider-runtime/nango-connect-session-launcher";

/**
 * Client-safe launcher fetch helper.
 * Sends explicit consent signal only — no secrets, OAuth tokens, or provider payloads.
 * Uses POST so Connect Session creation is an explicit same-origin mutation.
 */

export const PROVIDER_CONSENT_LAUNCHER_URL = "/provider-runtime/nango/connect";

export function buildProviderConsentLauncherUrl(
  provider: ProviderKind,
  explicitConsentChecked: boolean,
): string {
  const params = new URLSearchParams({ provider });
  if (explicitConsentChecked) {
    params.set("explicit_consent", "1");
  }

  return `${PROVIDER_CONSENT_LAUNCHER_URL}?${params.toString()}`;
}

export async function fetchProviderConsentLauncher(
  provider: ProviderKind,
  explicitConsentChecked: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<ApplyFlowNangoConnectLauncherResponse> {
  const response = await fetchImpl(PROVIDER_CONSENT_LAUNCHER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      explicitConsent: explicitConsentChecked,
    }),
  });

  if (!response.ok && response.status >= 500) {
    throw new Error(`Launcher request failed with status ${response.status}`);
  }

  return (await response.json()) as ApplyFlowNangoConnectLauncherResponse;
}

export async function runProviderConsentLauncherCheck(input: {
  explicitConsentChecked: boolean;
  provider: ProviderKind;
  fetchImpl?: typeof fetch;
}): Promise<{ called: false } | { called: true; result: ApplyFlowNangoConnectLauncherResponse }> {
  if (!input.explicitConsentChecked) {
    return { called: false };
  }

  const result = await fetchProviderConsentLauncher(
    input.provider,
    input.explicitConsentChecked,
    input.fetchImpl,
  );
  return { called: true, result };
}
