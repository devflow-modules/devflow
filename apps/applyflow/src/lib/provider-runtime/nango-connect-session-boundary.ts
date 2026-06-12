import {
  createNangoOAuthBoundaryResult,
  evaluateNangoOAuthBoundary,
  type NangoOAuthBoundaryRequest,
  type NangoOAuthBoundaryResult,
  type NangoOAuthUrlProvider,
  type ProviderRuntimeFlagMap,
} from "@devflow/career-sync";

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
  messages: string[];
  reasons: string[];
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
): ApplyFlowNangoConnectSessionResult {
  return {
    safeForClient: true,
    status: boundaryResult.status,
    provider: boundaryResult.provider,
    runtime: boundaryResult.runtime,
    canStartOAuth: boundaryResult.canStartOAuth,
    connectSessionUrl: boundaryResult.redirectTo,
    messages: boundaryResult.messages,
    reasons: boundaryResult.reasons,
  };
}

export async function createApplyFlowNangoConnectSessionBoundary(
  request: NangoOAuthBoundaryRequest,
  env: ApplyFlowNangoConnectSessionEnv,
  oauthUrlProvider: NangoOAuthUrlProvider,
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
        "No secret or token is returned to the client.",
      ],
      reasons: [...evaluation.reasons, "nango_secret_missing"],
    };
  }

  const boundaryResult = await createNangoOAuthBoundaryResult(
    boundaryRequest,
    oauthUrlProvider,
  );

  return toApplyFlowConnectSessionResult(boundaryResult);
}
