import type { NangoOAuthBoundaryRequest, NangoOAuthUrlProvider, ProviderKind } from "@devflow/career-sync";
import {
  createApplyFlowNangoConnectSessionBoundary,
  type ApplyFlowNangoConnectSessionEnv,
  type ApplyFlowNangoConnectSessionResult,
} from "./nango-connect-session-boundary";

export type ApplyFlowNangoConnectLauncherQuery = {
  provider?: string | null;
  redirectUri?: string | null;
};

export type ApplyFlowNangoConnectLauncherResponse = {
  safeForClient: true;
  status: "blocked" | "oauth_start_ready";
  provider?: "gmail" | "calendar";
  runtime: "nango";
  canStartOAuth: boolean;
  connectSessionUrl?: string;
  messages: string[];
  reasons: string[];
};

const PREVIEW_ONLY_CONSENT = {
  hasExplicitConsent: false,
  scopes: [] as string[],
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
    messages: result.messages,
    reasons: result.reasons,
  };
}

export async function handleApplyFlowNangoConnectSessionLauncher(
  query: ApplyFlowNangoConnectLauncherQuery,
  deps: {
    env: ApplyFlowNangoConnectSessionEnv;
    oauthUrlProvider: NangoOAuthUrlProvider;
    consent?: NangoOAuthBoundaryRequest["consent"];
    requestedAt?: string;
  },
): Promise<ApplyFlowNangoConnectLauncherResponse> {
  const providerValue = query.provider?.trim();

  if (!providerValue) {
    return blockedLauncherResponse({
      reasons: ["missing_provider"],
      messages: [
        "Provider query parameter is required.",
        "Launcher remains preview-only until explicit consent UI is enabled.",
      ],
    });
  }

  const provider = parseConnectLauncherProvider(providerValue);

  if (!provider) {
    return blockedLauncherResponse({
      reasons: ["invalid_provider"],
      messages: [
        "Provider query parameter must be gmail or calendar.",
        "Launcher remains preview-only until explicit consent UI is enabled.",
      ],
    });
  }

  const boundaryResult = await createApplyFlowNangoConnectSessionBoundary(
    {
      provider,
      runtime: "nango",
      flags: {},
      consent: deps.consent ?? PREVIEW_ONLY_CONSENT,
      requestedAt: deps.requestedAt ?? new Date().toISOString(),
      source: "applyflow",
      redirectUri: query.redirectUri?.trim() || undefined,
    },
    deps.env,
    deps.oauthUrlProvider,
  );

  return toLauncherResponse(boundaryResult);
}
