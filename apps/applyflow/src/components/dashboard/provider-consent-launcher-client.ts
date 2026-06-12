import type { ApplyFlowNangoConnectLauncherResponse } from "@/lib/provider-runtime/nango-connect-session-launcher";
import type { ProviderKind } from "@devflow/career-sync";

/**
 * Client-safe launcher fetch helper.
 * Does not send secrets, tokens, or provider payloads.
 */

export function buildProviderConsentLauncherUrl(provider: ProviderKind): string {
  return `/provider-runtime/nango/connect?provider=${encodeURIComponent(provider)}`;
}

export async function fetchProviderConsentLauncher(
  provider: ProviderKind,
  fetchImpl: typeof fetch = fetch,
): Promise<ApplyFlowNangoConnectLauncherResponse> {
  const response = await fetchImpl(buildProviderConsentLauncherUrl(provider));

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

  const result = await fetchProviderConsentLauncher(input.provider, input.fetchImpl);
  return { called: true, result };
}
