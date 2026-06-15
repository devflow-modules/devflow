import {
  createCalendarReadOnlyAdapterRequest,
  evaluateProviderRuntimeFlags,
  type CalendarReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { createCalendarReadOnlyNangoRuntimeAdapter } from "./calendar-readonly-nango-adapter";
import type { CalendarNangoRuntimeMetadataProvider } from "./calendar-readonly-nango-provider";
import { createCalendarNangoRuntimeMetadataProvider } from "./calendar-readonly-nango-provider";
import {
  envToProviderRuntimeFlags,
  type ApplyFlowNangoConnectSessionEnv,
} from "./nango-connect-session-boundary";
import { parseConnectionVerificationExplicitConsent } from "./nango-connection-verification-boundary";

export type ApplyFlowCalendarReadOnlyRuntimeQuery = {
  explicitConsent?: string | boolean | null;
};

export type ApplyFlowCalendarReadOnlyRuntimeDeps = {
  metadataProvider?: CalendarNangoRuntimeMetadataProvider;
};

function blockedRuntimeResult(input: {
  connectionVerified: boolean;
  warnings: string[];
}): CalendarReadOnlyAdapterResult {
  return {
    provider: "calendar",
    runtime: "nango",
    status: "blocked",
    safeForClient: true,
    readOnly: true,
    connectionVerified: input.connectionVerified,
    importedRawEvents: false,
    retainedRawPayload: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedAttendeeAddresses: false,
    hasToken: false,
    userReviewRequired: true,
    signals: [],
    warnings: input.warnings,
    messages: ["Calendar read-only runtime boundary blocked the request."],
    processedEventCount: 0,
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

  if (!flags.canUseCalendarProvider) {
    warnings.push("Calendar provider is disabled.");
  }

  return warnings;
}

export async function executeApplyFlowCalendarReadOnlyRuntimeBoundary(
  query: ApplyFlowCalendarReadOnlyRuntimeQuery,
  deps: {
    env: ApplyFlowNangoConnectSessionEnv;
    connectionVerified: boolean;
    requestedAt: string;
    window?: {
      from?: string;
      to?: string;
      maxEvents?: number;
    };
    runtimeDeps?: ApplyFlowCalendarReadOnlyRuntimeDeps;
  },
): Promise<CalendarReadOnlyAdapterResult> {
  if (!parseConnectionVerificationExplicitConsent(query.explicitConsent)) {
    return blockedRuntimeResult({
      connectionVerified: deps.connectionVerified,
      warnings: ["Explicit consent is required before Calendar read-only runtime."],
    });
  }

  const flagEvaluation = evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(deps.env));
  const flagWarnings = collectRuntimeBlockWarnings(flagEvaluation);

  if (flagWarnings.length > 0) {
    return blockedRuntimeResult({
      connectionVerified: deps.connectionVerified,
      warnings: flagWarnings,
    });
  }

  if (!deps.env.NANGO_SECRET_KEY?.trim()) {
    return blockedRuntimeResult({
      connectionVerified: deps.connectionVerified,
      warnings: ["Nango secret key is required server-side before Calendar read-only runtime."],
    });
  }

  if (!deps.connectionVerified) {
    return blockedRuntimeResult({
      connectionVerified: false,
      warnings: ["blocked:connection_not_verified"],
    });
  }

  const metadataProvider =
    deps.runtimeDeps?.metadataProvider ??
    createCalendarNangoRuntimeMetadataProvider({
      secretKey: deps.env.NANGO_SECRET_KEY,
    });

  const adapter = createCalendarReadOnlyNangoRuntimeAdapter({ metadataProvider });

  return adapter.execute(
    createCalendarReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt: deps.requestedAt,
      window: deps.window,
    }),
  );
}
