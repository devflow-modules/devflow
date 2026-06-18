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
  OPENCLAW_ENABLED?: string;
  OPENCLAW_API_KEY?: string;
  OPENCLAW_BASE_URL?: string;
  OPENCLAW_TIMEOUT_MS?: string;
};

const OPENCLAW_DEFAULT_TIMEOUT_MS = 10000;
const OPENCLAW_MAX_TIMEOUT_MS = 60000;
const MOCK_DEFAULT_TIMEOUT_MS = 10000;

export function isCareerAutomationEnabled(env: CareerAutomationEnv = process.env): boolean {
  return env.CAREER_AUTOMATION_ENABLED === "true";
}

export function isOpenClawEnabled(env: CareerAutomationEnv = process.env): boolean {
  return env.OPENCLAW_ENABLED === "true";
}

export function resolveCareerAutomationProvider(
  env: CareerAutomationEnv = process.env,
): CareerAutomationProvider {
  return env.CAREER_AUTOMATION_PROVIDER === "openclaw" ? "openclaw" : CAREER_AUTOMATION_DEFAULT_PROVIDER;
}

export function resolveOpenClawTimeoutMs(env: CareerAutomationEnv = process.env): number {
  const parsed = Number.parseInt(env.OPENCLAW_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return OPENCLAW_DEFAULT_TIMEOUT_MS;
  }
  return Math.min(OPENCLAW_MAX_TIMEOUT_MS, Math.max(1000, parsed));
}

function isOpenClawConfigured(env: CareerAutomationEnv): boolean {
  const hasKey = typeof env.OPENCLAW_API_KEY === "string" && env.OPENCLAW_API_KEY.length > 0;
  const hasBaseUrl = typeof env.OPENCLAW_BASE_URL === "string" && env.OPENCLAW_BASE_URL.length > 0;
  return isOpenClawEnabled(env) && hasKey && hasBaseUrl;
}

/**
 * Server-owned provider config. Secrets and base URL stay server-side and are never returned
 * to the client. There is no silent fallback from `openclaw` to `mock`: an unconfigured or
 * disabled OpenClaw provider stays selected and is blocked with a client-safe OpenClaw code.
 */
export function resolveCareerAutomationProviderConfig(
  env: CareerAutomationEnv = process.env,
): CareerAutomationProviderConfig {
  const provider = resolveCareerAutomationProvider(env);

  if (provider === "openclaw") {
    return {
      provider: "openclaw",
      timeoutMs: resolveOpenClawTimeoutMs(env),
      configured: isOpenClawConfigured(env),
    };
  }

  return {
    provider: "mock",
    timeoutMs: MOCK_DEFAULT_TIMEOUT_MS,
    configured: true,
  };
}

export function createCareerAutomationAdapter(
  config: CareerAutomationProviderConfig,
  env: CareerAutomationEnv = process.env,
): CareerAutomationAdapter {
  if (config.provider === "openclaw") {
    return createOpenClawCareerAutomationAdapter({
      enabled: isOpenClawEnabled(env),
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

export type CareerAutomationHealthStatus = {
  enabled: boolean;
  provider: CareerAutomationProvider;
  configured: boolean;
  reachable: boolean | null;
  timeoutMs: number;
};

/**
 * Client-safe health/status. Never returns secrets, the base URL, or internal IDs.
 * `reachable` stays `null` unless an explicit, controlled probe is requested — the health
 * endpoint does not contact OpenClaw on every request.
 */
export function resolveCareerAutomationHealthStatus(
  env: CareerAutomationEnv = process.env,
): CareerAutomationHealthStatus {
  const config = resolveCareerAutomationProviderConfig(env);
  return {
    enabled: isCareerAutomationEnabled(env),
    provider: config.provider,
    configured: config.configured,
    reachable: null,
    timeoutMs: config.timeoutMs,
  };
}

/**
 * Controlled reachability probe. Mock is always reachable (no network). For OpenClaw it
 * performs a single lightweight health lookup with an explicit timeout. The API key and
 * base URL are never returned; only a boolean reachability flag is exposed.
 */
export async function probeCareerAutomationReachable(
  env: CareerAutomationEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const provider = resolveCareerAutomationProvider(env);
  if (provider === "mock") {
    return true;
  }

  if (!isOpenClawConfigured(env)) {
    return false;
  }

  const baseUrl = (env.OPENCLAW_BASE_URL ?? "").replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveOpenClawTimeoutMs(env));

  try {
    const response = await fetchImpl(`${baseUrl}/health`, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.OPENCLAW_API_KEY ?? ""}` },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
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
