import {
  createNangoOAuthBoundaryResult,
  evaluateNangoOAuthBoundary,
  type NangoOAuthBoundaryRequest,
  type NangoOAuthBoundaryResult,
  type NangoOAuthUrlProvider,
  type ProviderRuntimeFlagMap,
} from "@devflow/career-sync";
import type { ApplyFlowNangoConnectSessionProvider } from "./nango-server-provider";

export type ApplyFlowNangoConnectSessionEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED?: string;
  NANGO_RUNTIME_ENABLED?: string;
  GMAIL_PROVIDER_ENABLED?: string;
  CALENDAR_PROVIDER_ENABLED?: string;
  NANGO_SECRET_KEY?: string;
};

export type ApplyFlowNangoConnectSessionResult = {
  safeForClient: true;
  status: "blocked" | "oauth_start_ready";
  provider: "gmail" | "calendar";
  runtime: "nango";
  canStartOAuth: boolean;
  connectSessionUrl?: string;
  connectSessionToken?: string;
  messages: string[];
  reasons: string[];
};

export type ApplyFlowNangoConnectSessionDeps = {
  oauthUrlProvider?: NangoOAuthUrlProvider;
  connectSessionProvider?: ApplyFlowNangoConnectSessionProvider;
};

export function envToProviderRuntimeFlags(
  env: ApplyFlowNangoConnectSessionEnv,
): ProviderRuntimeFlagMap {
  return {
    CAREER_PROVIDER_RUNTIME_ENABLED: env.CAREER_PROVIDER_RUNTIME_ENABLED,
    NANGO_RUNTIME_ENABLED: env.NANGO_RUNTIME_ENABLED,
    GMAIL_PROVIDER_ENABLED: env.GMAIL_PROVIDER_ENABLED,
    CALENDAR_PROVIDER_ENABLED: env.CALENDAR_PROVIDER_ENABLED,
  };
}

function toApplyFlowConnectSessionResult(
  boundaryResult: NangoOAuthBoundaryResult,
  session?: { connectSessionUrl: string; connectSessionToken: string },
): ApplyFlowNangoConnectSessionResult {
  return {
    safeForClient: true,
    status: boundaryResult.status,
    provider: boundaryResult.provider,
    runtime: boundaryResult.runtime,
    canStartOAuth: boundaryResult.canStartOAuth,
    connectSessionUrl: session?.connectSessionUrl ?? boundaryResult.redirectTo,
    connectSessionToken: session?.connectSessionToken,
    messages: boundaryResult.messages,
    reasons: boundaryResult.reasons,
  };
}

export async function createApplyFlowNangoConnectSessionBoundary(
  request: NangoOAuthBoundaryRequest,
  env: ApplyFlowNangoConnectSessionEnv,
  deps: ApplyFlowNangoConnectSessionDeps,
): Promise<ApplyFlowNangoConnectSessionResult> {
  const boundaryRequest: NangoOAuthBoundaryRequest = {
    ...request,
    flags: envToProviderRuntimeFlags(env),
  };

  const evaluation = evaluateNangoOAuthBoundary(boundaryRequest);

  if (evaluation.status === "blocked") {
    return toApplyFlowConnectSessionResult(evaluation);
  }

  if (!env.NANGO_SECRET_KEY?.trim()) {
    return {
      safeForClient: true,
      status: "blocked",
      provider: evaluation.provider,
      runtime: evaluation.runtime,
      canStartOAuth: false,
      messages: [
        ...evaluation.messages,
        "Nango secret key is required server-side before OAuth can start.",
        "No secret or OAuth token is returned to the client.",
      ],
      reasons: [...evaluation.reasons, "nango_secret_missing"],
    };
  }

  if (deps.connectSessionProvider) {
    const session = await deps.connectSessionProvider.createConnectSession({
      provider: boundaryRequest.provider,
      redirectUri: boundaryRequest.redirectUri,
    });

    return {
      safeForClient: true,
      status: "oauth_start_ready",
      provider: evaluation.provider,
      runtime: evaluation.runtime,
      canStartOAuth: true,
      connectSessionUrl: session.connectSessionUrl,
      connectSessionToken: session.connectSessionToken,
      messages: [
        ...evaluation.messages,
        "Nango Connect session token is client-safe and short-lived.",
        "No OAuth access token, refresh token, authorization code, or secret is included.",
        "Provider API calls and sync jobs remain disabled in this release.",
      ],
      reasons: evaluation.reasons,
    };
  }

  if (!deps.oauthUrlProvider) {
    return {
      safeForClient: true,
      status: "blocked",
      provider: evaluation.provider,
      runtime: evaluation.runtime,
      canStartOAuth: false,
      messages: [
        ...evaluation.messages,
        "Connect session provider is unavailable server-side.",
      ],
      reasons: [...evaluation.reasons, "nango_connect_session_provider_missing"],
    };
  }

  const boundaryResult = await createNangoOAuthBoundaryResult(
    boundaryRequest,
    deps.oauthUrlProvider,
  );

  return toApplyFlowConnectSessionResult(boundaryResult);
}
