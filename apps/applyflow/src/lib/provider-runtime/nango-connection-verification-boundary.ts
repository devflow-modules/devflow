import {
  createProviderConnectionVerificationResult,
  evaluateProviderRuntimeFlags,
  type ProviderConnectionVerificationRequest,
  type ProviderConnectionVerificationResult,
  type ProviderKind,
} from "@devflow/career-sync";
import type { ApplyFlowNangoConnectSessionEnv } from "./nango-connect-session-boundary";
import { envToProviderRuntimeFlags } from "./nango-connect-session-boundary";
import type { NangoConnectionVerificationProvider } from "./nango-connection-verification-provider";

export type ApplyFlowNangoConnectionVerificationQuery = {
  provider?: string | null;
  explicitConsent?: string | boolean | null;
};

export type ApplyFlowNangoConnectionVerificationResponse = ProviderConnectionVerificationResult;

export type ApplyFlowNangoConnectionVerificationDeps = {
  verificationProvider?: NangoConnectionVerificationProvider;
};

function blockedVerificationResult(input: {
  provider: ProviderKind;
  checkedAt: string;
  warnings: string[];
  state?: "not_connected" | "error";
}): ProviderConnectionVerificationResult {
  return createProviderConnectionVerificationResult({
    provider: input.provider,
    runtime: "nango",
    state: input.state ?? "error",
    checkedAt: input.checkedAt,
    warnings: input.warnings,
  });
}

function collectVerificationBlockWarnings(
  flags: ReturnType<typeof evaluateProviderRuntimeFlags>,
  provider: ProviderKind,
): string[] {
  const warnings: string[] = [];

  if (!flags.careerProviderRuntimeEnabled) {
    warnings.push("Provider runtime is disabled.");
  }

  if (!flags.canUseNangoRuntime) {
    warnings.push("Nango runtime is disabled.");
  }

  if (provider === "gmail" && !flags.canUseGmailProvider) {
    warnings.push("Gmail provider is disabled.");
  }

  if (provider === "calendar" && !flags.canUseCalendarProvider) {
    warnings.push("Calendar provider is disabled.");
  }

  return warnings;
}

export function parseConnectionVerificationProvider(
  provider: string | null | undefined,
): ProviderKind | null {
  if (provider === "gmail" || provider === "calendar") {
    return provider;
  }

  return null;
}

export function parseConnectionVerificationExplicitConsent(
  explicitConsent: string | boolean | null | undefined,
): boolean {
  if (explicitConsent === true || explicitConsent === "1" || explicitConsent === "true") {
    return true;
  }

  return false;
}

export async function handleApplyFlowNangoConnectionVerification(
  query: ApplyFlowNangoConnectionVerificationQuery,
  deps: {
    env: ApplyFlowNangoConnectSessionEnv;
    verificationDeps: ApplyFlowNangoConnectionVerificationDeps;
    requestedAt?: string;
  },
): Promise<ProviderConnectionVerificationResult> {
  const checkedAt = deps.requestedAt ?? new Date().toISOString();
  const providerValue = query.provider?.trim();

  if (!providerValue) {
    return createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "error",
      checkedAt,
      warnings: ["Provider is required for server verification."],
    });
  }

  const provider = parseConnectionVerificationProvider(providerValue);

  if (!provider) {
    return createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "error",
      checkedAt,
      warnings: ["Provider must be gmail or calendar."],
    });
  }

  if (!parseConnectionVerificationExplicitConsent(query.explicitConsent)) {
    return blockedVerificationResult({
      provider,
      checkedAt,
      state: "error",
      warnings: ["Explicit consent is required before server verification."],
    });
  }

  const flagEvaluation = evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(deps.env));
  const flagWarnings = collectVerificationBlockWarnings(flagEvaluation, provider);

  if (flagWarnings.length > 0) {
    return blockedVerificationResult({
      provider,
      checkedAt,
      state: "error",
      warnings: flagWarnings,
    });
  }

  if (!deps.env.NANGO_SECRET_KEY?.trim()) {
    return blockedVerificationResult({
      provider,
      checkedAt,
      warnings: ["Nango secret key is required server-side before verification."],
    });
  }

  if (!deps.verificationDeps.verificationProvider) {
    return blockedVerificationResult({
      provider,
      checkedAt,
      warnings: ["Nango connection verification provider is unavailable server-side."],
    });
  }

  const providerResult = await deps.verificationDeps.verificationProvider.verifyConnection({
    provider,
  });

  if (providerResult.state === "connected") {
    return createProviderConnectionVerificationResult({
      provider,
      runtime: "nango",
      state: "connected",
      checkedAt,
    });
  }

  if (providerResult.state === "not_connected") {
    return createProviderConnectionVerificationResult({
      provider,
      runtime: "nango",
      state: "not_connected",
      checkedAt,
    });
  }

  return createProviderConnectionVerificationResult({
    provider,
    runtime: "nango",
    state: "error",
    checkedAt,
  });
}

export function toProviderConnectionVerificationRequest(input: {
  provider: ProviderKind;
  requestedAt: string;
}): ProviderConnectionVerificationRequest {
  return {
    provider: input.provider,
    runtime: "nango",
    requestedAt: input.requestedAt,
  };
}
