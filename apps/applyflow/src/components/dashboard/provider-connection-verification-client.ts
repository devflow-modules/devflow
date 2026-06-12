import type { ProviderConnectionVerificationResult, ProviderKind } from "@devflow/career-sync";

/**
 * Client-safe connection verification fetch helper.
 * Sends explicit consent signal only — no secrets, OAuth tokens, or provider payloads.
 */

export function buildProviderConnectionVerificationUrl(): string {
  return "/provider-runtime/nango/connection-status";
}

export async function fetchProviderConnectionVerification(
  provider: ProviderKind,
  explicitConsentChecked: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderConnectionVerificationResult> {
  const response = await fetchImpl(buildProviderConnectionVerificationUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      explicitConsent: explicitConsentChecked,
    }),
  });

  if (!response.ok && response.status >= 500) {
    throw new Error(`Verification request failed with status ${response.status}`);
  }

  return (await response.json()) as ProviderConnectionVerificationResult;
}

export async function runProviderConnectionVerificationCheck(input: {
  explicitConsentChecked: boolean;
  provider: ProviderKind;
  fetchImpl?: typeof fetch;
}): Promise<
  { called: false } | { called: true; result: ProviderConnectionVerificationResult }
> {
  if (!input.explicitConsentChecked) {
    return { called: false };
  }

  const result = await fetchProviderConnectionVerification(
    input.provider,
    input.explicitConsentChecked,
    input.fetchImpl,
  );
  return { called: true, result };
}

export function shouldShowVerifyConnectionButton(input: {
  explicitConsentChecked: boolean;
  localConnectionState: string;
  isVerifying: boolean;
}): boolean {
  if (!input.explicitConsentChecked || input.isVerifying) {
    return false;
  }

  return input.localConnectionState === "connected";
}

export function formatLocalConnectionFlowLabel(state: string): string {
  switch (state) {
    case "connecting":
      return "in progress";
    case "connected":
      return "completed";
    case "error":
      return "failed";
    case "revoked":
      return "revoked";
    case "not_connected":
    default:
      return "not started";
  }
}

export function formatServerVerificationLabel(
  verificationResult: ProviderConnectionVerificationResult | null,
  isVerifying: boolean,
): string {
  if (isVerifying) {
    return "verification_pending";
  }

  if (!verificationResult) {
    return "not checked";
  }

  return verificationResult.state;
}
