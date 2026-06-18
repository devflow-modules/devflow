import {
  CAREER_AUTOMATION_DEFAULT_PROVIDER,
  createMockCareerAutomationAdapter,
  executeCareerAutomation,
  parseCareerAutomationExecuteBody,
  scanCareerAutomationPayloadForForbiddenKeys,
  type CareerAutomationAdapter,
  type CareerAutomationExecuteBody,
  type CareerAutomationExecutionResult,
  type CareerAutomationProvider,
  type CareerAutomationProviderConfig,
} from "@devflow/career-core";
import { createOpenClawCareerAutomationAdapter } from "./openclaw-provider";

export const CAREER_AUTOMATION_BLOCKED_MESSAGE =
  "Approved automation is blocked until the request is valid, approved, and feature-flagged.";

export type CareerAutomationRequestError = "invalid_json" | "invalid_request";

type CareerAutomationEnv = {
  CAREER_AUTOMATION_ENABLED?: string;
  CAREER_AUTOMATION_PROVIDER?: string;
  OPENCLAW_API_KEY?: string;
  OPENCLAW_BASE_URL?: string;
};

export function isCareerAutomationEnabled(env: CareerAutomationEnv = process.env): boolean {
  return env.CAREER_AUTOMATION_ENABLED === "true";
}

export function resolveCareerAutomationProvider(
  env: CareerAutomationEnv = process.env,
): CareerAutomationProvider {
  return env.CAREER_AUTOMATION_PROVIDER === "openclaw" ? "openclaw" : CAREER_AUTOMATION_DEFAULT_PROVIDER;
}

/**
 * Server-owned provider config. Secrets stay server-side and are never returned to the client.
 */
export function resolveCareerAutomationProviderConfig(
  env: CareerAutomationEnv = process.env,
): CareerAutomationProviderConfig {
  const provider = resolveCareerAutomationProvider(env);

  if (provider === "openclaw") {
    return {
      provider: "openclaw",
      timeoutMs: 15000,
      configured:
        typeof env.OPENCLAW_API_KEY === "string" &&
        env.OPENCLAW_API_KEY.length > 0 &&
        typeof env.OPENCLAW_BASE_URL === "string" &&
        env.OPENCLAW_BASE_URL.length > 0,
    };
  }

  return {
    provider: "mock",
    timeoutMs: 10000,
    configured: true,
  };
}

export function createCareerAutomationAdapter(
  config: CareerAutomationProviderConfig,
  env: CareerAutomationEnv = process.env,
): CareerAutomationAdapter {
  if (config.provider === "openclaw") {
    return createOpenClawCareerAutomationAdapter({
      apiKey: env.OPENCLAW_API_KEY ?? "",
      baseUrl: env.OPENCLAW_BASE_URL ?? "",
      timeoutMs: config.timeoutMs,
    });
  }

  return createMockCareerAutomationAdapter();
}

export function parseCareerAutomationExecuteRequest(
  body: unknown,
): { ok: true; request: CareerAutomationExecuteBody } | { ok: false; error: CareerAutomationRequestError } {
  if (body == null) {
    return { ok: false, error: "invalid_request" };
  }

  const parsed = parseCareerAutomationExecuteBody(body);
  if (!parsed.ok) {
    return { ok: false, error: "invalid_request" };
  }

  if (scanCareerAutomationPayloadForForbiddenKeys(parsed.value).length > 0) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, request: parsed.value };
}

export function createBlockedCareerAutomationResult(
  warningCode: string,
  env: CareerAutomationEnv = process.env,
): CareerAutomationExecutionResult {
  return {
    status: "blocked",
    provider: resolveCareerAutomationProvider(env),
    proposalId: "blocked",
    kind: "unsupported_automation_kind",
    toolName: "unknown",
    data: {},
    warnings: [{ code: "invalid_automation_request", message: `${warningCode}: ${CAREER_AUTOMATION_BLOCKED_MESSAGE}` }],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    backgroundExecution: false,
    scheduled: false,
    trace: { requestId: "blocked", proposalId: "blocked", steps: [] },
  };
}

export async function handleCareerAutomationExecute(
  request: CareerAutomationExecuteBody,
  requestedAt: string,
  env: CareerAutomationEnv = process.env,
): Promise<CareerAutomationExecutionResult> {
  const providerConfig = resolveCareerAutomationProviderConfig(env);
  const adapter = createCareerAutomationAdapter(providerConfig, env);

  return executeCareerAutomation({
    body: request,
    requestedAt,
    automationEnabled: isCareerAutomationEnabled(env),
    providerConfig,
    adapter,
  });
}

export function resolveCareerAutomationHttpStatus(result: CareerAutomationExecutionResult): number {
  if (result.status === "blocked") {
    return 403;
  }

  if (result.status === "error") {
    return 500;
  }

  return 200;
}
