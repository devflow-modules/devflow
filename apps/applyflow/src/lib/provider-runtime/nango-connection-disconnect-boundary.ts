import {
  createProviderConnectionDisconnectResult,
  evaluateProviderRuntimeFlags,
  type ProviderConnectionDisconnectResult,
  type ProviderKind,
} from "@devflow/career-sync";
import type { ApplyFlowNangoConnectSessionEnv } from "./nango-connect-session-boundary";
import { envToProviderRuntimeFlags } from "./nango-connect-session-boundary";
import type { NangoConnectionDisconnectProvider } from "./nango-connection-disconnect-provider";
import { parseConnectionVerificationProvider } from "./nango-connection-verification-boundary";

export type ApplyFlowNangoConnectionDisconnectQuery = {
  provider?: string | null;
  explicitConfirmation?: string | boolean | null;
};

export type ApplyFlowNangoConnectionDisconnectDeps = {
  disconnectProvider?: NangoConnectionDisconnectProvider;
};

function parseExplicitConfirmation(
  explicitConfirmation: string | boolean | null | undefined,
): boolean {
  if (explicitConfirmation === true || explicitConfirmation === "1" || explicitConfirmation === "true") {
    return true;
  }

  return false;
}

function collectDisconnectBlockWarnings(
  flags: ReturnType<typeof evaluateProviderRuntimeFlags>,
  provider: ProviderKind,
): string[] {
  const warnings: string[] = [];

  if (!flags.careerProviderRuntimeEnabled) {
    warnings.push("runtime_disabled");
  }

  if (!flags.canUseNangoRuntime) {
    warnings.push("nango_runtime_disabled");
  }

  if (provider === "gmail" && !flags.canUseGmailProvider) {
    warnings.push("provider_disabled");
  }

  if (provider === "calendar" && !flags.canUseCalendarProvider) {
    warnings.push("provider_disabled");
  }

  return warnings;
}

function blockedDisconnectResult(input: {
  provider: ProviderKind;
  warnings: string[];
  verifiedByServer?: boolean;
}): ProviderConnectionDisconnectResult {
  return createProviderConnectionDisconnectResult({
    provider: input.provider,
    runtime: "nango",
    status: "blocked",
    disconnected: false,
    previouslyConnected: false,
    verifiedByServer: input.verifiedByServer ?? false,
    warnings: input.warnings,
  });
}

export async function handleApplyFlowNangoConnectionDisconnect(
  query: ApplyFlowNangoConnectionDisconnectQuery,
  deps: {
    env: ApplyFlowNangoConnectSessionEnv;
    disconnectDeps: ApplyFlowNangoConnectionDisconnectDeps;
    requestedAt?: string;
  },
): Promise<ProviderConnectionDisconnectResult> {
  const providerValue = query.provider?.trim();
  const provider = parseConnectionVerificationProvider(providerValue);

  if (!provider) {
    return createProviderConnectionDisconnectResult({
      provider: "gmail",
      runtime: "nango",
      status: "error",
      disconnected: false,
      previouslyConnected: false,
      verifiedByServer: false,
      warnings: ["invalid_provider"],
    });
  }

  if (!parseExplicitConfirmation(query.explicitConfirmation)) {
    return blockedDisconnectResult({
      provider,
      warnings: ["explicit_confirmation_required"],
    });
  }

  const flagEvaluation = evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(deps.env));
  const flagWarnings = collectDisconnectBlockWarnings(flagEvaluation, provider);

  if (flagWarnings.length > 0) {
    return blockedDisconnectResult({
      provider,
      warnings: flagWarnings,
    });
  }

  if (!deps.env.NANGO_SECRET_KEY?.trim()) {
    return blockedDisconnectResult({
      provider,
      warnings: ["nango_secret_missing"],
    });
  }

  if (!deps.disconnectDeps.disconnectProvider) {
    return blockedDisconnectResult({
      provider,
      warnings: ["nango_disconnect_provider_unavailable"],
    });
  }

  const outcome = await deps.disconnectDeps.disconnectProvider.disconnectProvider({ provider });

  if (outcome.kind === "not_found") {
    return createProviderConnectionDisconnectResult({
      provider,
      runtime: "nango",
      status: "completed",
      disconnected: true,
      previouslyConnected: false,
      verifiedByServer: true,
    });
  }

  if (outcome.kind === "ambiguous") {
    return createProviderConnectionDisconnectResult({
      provider,
      runtime: "nango",
      status: "error",
      disconnected: false,
      previouslyConnected: true,
      verifiedByServer: true,
      warnings: ["ambiguous_provider_connections"],
    });
  }

  if (outcome.kind === "delete_failed") {
    return createProviderConnectionDisconnectResult({
      provider,
      runtime: "nango",
      status: "blocked",
      disconnected: false,
      previouslyConnected: true,
      verifiedByServer: false,
      warnings: ["nango_connection_delete_failed"],
    });
  }

  if (outcome.kind === "verification_failed") {
    return createProviderConnectionDisconnectResult({
      provider,
      runtime: "nango",
      status: "error",
      disconnected: false,
      previouslyConnected: true,
      verifiedByServer: true,
      warnings: ["post_delete_verification_failed"],
    });
  }

  return createProviderConnectionDisconnectResult({
    provider,
    runtime: "nango",
    status: "completed",
    disconnected: true,
    previouslyConnected: true,
    verifiedByServer: true,
  });
}

export function resolveProviderConnectionDisconnectHttpStatus(
  result: ProviderConnectionDisconnectResult,
  input: {
    invalidProvider?: boolean;
    missingConfirmation?: boolean;
  },
): number {
  if (input.invalidProvider) {
    return 400;
  }

  if (input.missingConfirmation) {
    return 403;
  }

  return 200;
}
