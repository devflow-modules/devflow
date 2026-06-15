import {
  createGmailReadOnlyAdapterRequest,
  evaluateProviderRuntimeFlags,
  type GmailReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { createGmailReadOnlyNangoRuntimeAdapter } from "./gmail-readonly-nango-adapter.js";
import type { GmailNangoRuntimeMetadataProvider } from "./gmail-readonly-nango-provider.js";
import { createGmailNangoRuntimeMetadataProvider } from "./gmail-readonly-nango-provider.js";
import {
  envToProviderRuntimeFlags,
  type ApplyFlowNangoConnectSessionEnv,
} from "./nango-connect-session-boundary.js";
import { parseConnectionVerificationExplicitConsent } from "./nango-connection-verification-boundary.js";

export type ApplyFlowGmailReadOnlyRuntimeQuery = {
  explicitConsent?: string | boolean | null;
};

export type ApplyFlowGmailReadOnlyRuntimeDeps = {
  metadataProvider?: GmailNangoRuntimeMetadataProvider;
};

function blockedRuntimeResult(input: {
  connectionVerified: boolean;
  requestedAt: string;
  warnings: string[];
}): GmailReadOnlyAdapterResult {
  return {
    provider: "gmail",
    runtime: "nango",
    status: "blocked",
    safeForClient: true,
    readOnly: true,
    connectionVerified: input.connectionVerified,
    importedRawMessages: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedAttachments: false,
    hasToken: false,
    userReviewRequired: true,
    signals: [],
    warnings: input.warnings,
    messages: ["Gmail read-only runtime boundary blocked the request."],
    processedMessageCount: 0,
  };
}

function collectRuntimeBlockWarnings(
  flags: ReturnType<typeof evaluateProviderRuntimeFlags>,
): string[] {
  const warnings: string[] = [];

  if (!flags.careerProviderRuntimeEnabled) {
    warnings.push("Provider runtime is disabled.");
  }

  if (!flags.canUseNangoRuntime) {
    warnings.push("Nango runtime is disabled.");
  }

  if (!flags.canUseGmailProvider) {
    warnings.push("Gmail provider is disabled.");
  }

  return warnings;
}

export async function executeApplyFlowGmailReadOnlyRuntimeBoundary(
  query: ApplyFlowGmailReadOnlyRuntimeQuery,
  deps: {
    env: ApplyFlowNangoConnectSessionEnv;
    connectionVerified: boolean;
    requestedAt: string;
    window?: {
      from?: string;
      to?: string;
      maxMessages?: number;
    };
    runtimeDeps?: ApplyFlowGmailReadOnlyRuntimeDeps;
  },
): Promise<GmailReadOnlyAdapterResult> {
  const requestedAt = deps.requestedAt;

  if (!parseConnectionVerificationExplicitConsent(query.explicitConsent)) {
    return blockedRuntimeResult({
      connectionVerified: deps.connectionVerified,
      requestedAt,
      warnings: ["Explicit consent is required before Gmail read-only runtime."],
    });
  }

  const flagEvaluation = evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(deps.env));
  const flagWarnings = collectRuntimeBlockWarnings(flagEvaluation);

  if (flagWarnings.length > 0) {
    return blockedRuntimeResult({
      connectionVerified: deps.connectionVerified,
      requestedAt,
      warnings: flagWarnings,
    });
  }

  if (!deps.env.NANGO_SECRET_KEY?.trim()) {
    return blockedRuntimeResult({
      connectionVerified: deps.connectionVerified,
      requestedAt,
      warnings: ["Nango secret key is required server-side before Gmail read-only runtime."],
    });
  }

  if (!deps.connectionVerified) {
    return blockedRuntimeResult({
      connectionVerified: false,
      requestedAt,
      warnings: ["blocked:connection_not_verified"],
    });
  }

  const metadataProvider =
    deps.runtimeDeps?.metadataProvider ??
    createGmailNangoRuntimeMetadataProvider({
      secretKey: deps.env.NANGO_SECRET_KEY,
    });

  const adapter = createGmailReadOnlyNangoRuntimeAdapter({ metadataProvider });

  return adapter.execute(
    createGmailReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: deps.window,
    }),
  );
}
