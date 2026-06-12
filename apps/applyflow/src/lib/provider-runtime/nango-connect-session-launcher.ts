import type { NangoOAuthBoundaryRequest, NangoOAuthUrlProvider, ProviderKind } from "@devflow/career-sync";
import {
  createApplyFlowNangoConnectSessionBoundary,
  type ApplyFlowNangoConnectSessionDeps,
  type ApplyFlowNangoConnectSessionEnv,
  type ApplyFlowNangoConnectSessionResult,
} from "./nango-connect-session-boundary";

export type ApplyFlowNangoConnectLauncherQuery = {
  provider?: string | null;
  redirectUri?: string | null;
  explicitConsent?: string | null;
};

export type ApplyFlowNangoConnectLauncherResponse = {
  safeForClient: true;
  status: "blocked" | "oauth_start_ready";
  provider?: "gmail" | "calendar";
  runtime: "nango";
  canStartOAuth: boolean;
  connectSessionUrl?: string;
  connectSessionToken?: string;
  messages: string[];
  reasons: string[];
};

const PREVIEW_ONLY_CONSENT = {
  hasExplicitConsent: false,
  scopes: [] as string[],
};

const PROVIDER_SCOPES: Record<ProviderKind, string[]> = {
  gmail: ["gmail.metadata.read"],
  calendar: ["calendar.events.read"],
};

export function readApplyFlowNangoConnectSessionEnv(
  env: NodeJS.ProcessEnv = process.env,
): ApplyFlowNangoConnectSessionEnv {
  return {
    CAREER_PROVIDER_RUNTIME_ENABLED: env.CAREER_PROVIDER_RUNTIME_ENABLED,
    NANGO_RUNTIME_ENABLED: env.NANGO_RUNTIME_ENABLED,
    GMAIL_PROVIDER_ENABLED: env.GMAIL_PROVIDER_ENABLED,
    CALENDAR_PROVIDER_ENABLED: env.CALENDAR_PROVIDER_ENABLED,
    NANGO_SECRET_KEY: env.NANGO_SECRET_KEY,
  };
}

export function parseConnectLauncherProvider(
  provider: string | null | undefined,
): ProviderKind | null {
  if (provider === "gmail" || provider === "calendar") {
    return provider;
  }

  return null;
}

export function parseConnectLauncherExplicitConsent(
  explicitConsent: string | null | undefined,
  provider: ProviderKind,
  requestedAt: string,
): NangoOAuthBoundaryRequest["consent"] {
  if (explicitConsent === "1" || explicitConsent === "true") {
    return {
      hasExplicitConsent: true,
      consentedAt: requestedAt,
      scopes: PROVIDER_SCOPES[provider],
    };
  }

  return PREVIEW_ONLY_CONSENT;
}

function blockedLauncherResponse(input: {
  provider?: "gmail" | "calendar";
  reasons: string[];
  messages: string[];
}): ApplyFlowNangoConnectLauncherResponse {
  return {
    safeForClient: true,
    status: "blocked",
    provider: input.provider,
    runtime: "nango",
    canStartOAuth: false,
    messages: input.messages,
    reasons: input.reasons,
  };
}

function toLauncherResponse(
  result: ApplyFlowNangoConnectSessionResult,
): ApplyFlowNangoConnectLauncherResponse {
  return {
    safeForClient: true,
    status: result.status,
    provider: result.provider,
    runtime: result.runtime,
    canStartOAuth: result.canStartOAuth,
    connectSessionUrl: result.connectSessionUrl,
    connectSessionToken: result.connectSessionToken,
    messages: result.messages,
    reasons: result.reasons,
  };
}

export async function handleApplyFlowNangoConnectSessionLauncher(
  query: ApplyFlowNangoConnectLauncherQuery,
  deps: {
    env: ApplyFlowNangoConnectSessionEnv;
    sessionDeps: ApplyFlowNangoConnectSessionDeps;
    oauthUrlProvider?: NangoOAuthUrlProvider;
    requestedAt?: string;
  },
): Promise<ApplyFlowNangoConnectLauncherResponse> {
  const providerValue = query.provider?.trim();
  const requestedAt = deps.requestedAt ?? new Date().toISOString();

  if (!providerValue) {
    return blockedLauncherResponse({
      reasons: ["missing_provider"],
      messages: [
        "Provider query parameter is required.",
        "Launcher requires explicit consent before Connect UI can start.",
      ],
    });
  }

  const provider = parseConnectLauncherProvider(providerValue);

  if (!provider) {
    return blockedLauncherResponse({
      reasons: ["invalid_provider"],
      messages: [
        "Provider query parameter must be gmail or calendar.",
        "Launcher requires explicit consent before Connect UI can start.",
      ],
    });
  }

  const boundaryResult = await createApplyFlowNangoConnectSessionBoundary(
    {
      provider,
      runtime: "nango",
      flags: {},
      consent: parseConnectLauncherExplicitConsent(query.explicitConsent, provider, requestedAt),
      requestedAt,
      source: "applyflow",
      redirectUri: query.redirectUri?.trim() || undefined,
    },
    deps.env,
    deps.sessionDeps,
  );

  return toLauncherResponse(boundaryResult);
}
