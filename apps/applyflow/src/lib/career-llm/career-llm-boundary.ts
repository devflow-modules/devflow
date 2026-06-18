import {
  CAREER_LLM_DEFAULT_MODEL_ALIAS,
  createCareerLlmTrace,
  createMockCareerLlmProvider,
  parseCareerLlmGenerateBody,
  runCareerLlmGeneration,
  scanCareerLlmPayloadForForbiddenKeys,
  type CareerLlmGenerateBody,
  type CareerLlmProvider,
  type CareerLlmProviderAdapter,
  type CareerLlmProviderConfig,
  type CareerLlmResult,
} from "@devflow/career-core";
import { createOpenAiCareerLlmProvider } from "./openai-provider";

export const CAREER_LLM_BLOCKED_MESSAGE =
  "Controlled LLM generation is blocked until the request is valid, consented, and feature-flagged.";

export type CareerLlmRequestError = "invalid_json" | "invalid_request";

type CareerLlmEnv = {
  CAREER_LLM_ENABLED?: string;
  CAREER_LLM_PROVIDER?: string;
  CAREER_LLM_MODEL?: string;
  CAREER_LLM_TIMEOUT_MS?: string;
  CAREER_LLM_MAX_RETRIES?: string;
  OPENAI_API_KEY?: string;
};

const CAREER_LLM_OPENAI_MODEL_ALIAS = "career-openai-1";
const CAREER_LLM_DEFAULT_TIMEOUT_MS = 15000;
const CAREER_LLM_MAX_TIMEOUT_MS = 60000;
const CAREER_LLM_DEFAULT_MAX_RETRIES = 1;
const CAREER_LLM_RETRY_CEILING = 3;

export function isCareerLlmEnabled(env: CareerLlmEnv = process.env): boolean {
  return env.CAREER_LLM_ENABLED === "true";
}

export function resolveCareerLlmProvider(env: CareerLlmEnv = process.env): CareerLlmProvider {
  return env.CAREER_LLM_PROVIDER === "openai" ? "openai" : "mock";
}

function resolveBoundedInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function resolveCareerLlmTimeoutMs(env: CareerLlmEnv = process.env): number {
  return resolveBoundedInt(env.CAREER_LLM_TIMEOUT_MS, CAREER_LLM_DEFAULT_TIMEOUT_MS, 1000, CAREER_LLM_MAX_TIMEOUT_MS);
}

export function resolveCareerLlmMaxRetries(env: CareerLlmEnv = process.env): number {
  return resolveBoundedInt(env.CAREER_LLM_MAX_RETRIES, CAREER_LLM_DEFAULT_MAX_RETRIES, 0, CAREER_LLM_RETRY_CEILING);
}

function isOpenAiConfigured(env: CareerLlmEnv): boolean {
  const hasKey = typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.length > 0;
  const hasModel = typeof env.CAREER_LLM_MODEL === "string" && env.CAREER_LLM_MODEL.trim().length > 0;
  return hasKey && hasModel;
}

/**
 * Resolves a server-owned provider config. Secrets stay server-side and are never returned.
 * The OpenAI model is server-owned (`CAREER_LLM_MODEL`); there is no hardcoded model and no
 * silent fallback from `openai` to `mock` — an unconfigured `openai` provider is reported as
 * not configured and blocked by policy.
 */
export function resolveCareerLlmProviderConfig(
  env: CareerLlmEnv = process.env,
): CareerLlmProviderConfig {
  const provider = resolveCareerLlmProvider(env);

  if (provider === "openai") {
    return {
      provider: "openai",
      modelAlias: CAREER_LLM_OPENAI_MODEL_ALIAS,
      temperature: 0,
      maxOutputTokens: 1024,
      timeoutMs: resolveCareerLlmTimeoutMs(env),
      configured: isOpenAiConfigured(env),
    };
  }

  return {
    provider: "mock",
    modelAlias: CAREER_LLM_DEFAULT_MODEL_ALIAS,
    temperature: 0,
    maxOutputTokens: 1024,
    timeoutMs: 10000,
    configured: true,
  };
}

export function createCareerLlmProviderAdapter(
  config: CareerLlmProviderConfig,
  env: CareerLlmEnv = process.env,
): CareerLlmProviderAdapter {
  if (config.provider === "openai") {
    return createOpenAiCareerLlmProvider({
      apiKey: env.OPENAI_API_KEY ?? "",
      model: (env.CAREER_LLM_MODEL ?? "").trim(),
      modelAlias: config.modelAlias,
      maxRetries: resolveCareerLlmMaxRetries(env),
    });
  }

  return createMockCareerLlmProvider();
}

export function parseCareerLlmGenerateRequest(
  body: unknown,
): { ok: true; request: CareerLlmGenerateBody } | { ok: false; error: CareerLlmRequestError } {
  if (body == null) {
    return { ok: false, error: "invalid_request" };
  }

  const parsed = parseCareerLlmGenerateBody(body);
  if (!parsed.ok) {
    return { ok: false, error: "invalid_request" };
  }

  if (scanCareerLlmPayloadForForbiddenKeys(parsed.value).length > 0) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, request: parsed.value };
}

export function createBlockedCareerLlmResult(
  warningCode: string,
  env: CareerLlmEnv = process.env,
): CareerLlmResult {
  return {
    status: "blocked",
    provider: resolveCareerLlmProvider(env),
    task: "unsupported_llm_task",
    agent: "career_orchestrator",
    output: null,
    warnings: [{ code: warningCode, message: CAREER_LLM_BLOCKED_MESSAGE }],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    externalProviderCalled: false,
    toolExecutionOccurred: false,
    trace: createCareerLlmTrace("blocked"),
  };
}

export async function handleCareerLlmGenerate(
  request: CareerLlmGenerateBody,
  requestedAt: string,
  env: CareerLlmEnv = process.env,
): Promise<CareerLlmResult> {
  const providerConfig = resolveCareerLlmProviderConfig(env);
  const provider = createCareerLlmProviderAdapter(providerConfig, env);

  return runCareerLlmGeneration({
    body: request,
    requestedAt,
    adapterEnabled: isCareerLlmEnabled(env),
    providerConfig,
    provider,
  });
}

export type CareerLlmHealthStatus = {
  enabled: boolean;
  provider: CareerLlmProvider;
  configured: boolean;
  modelAlias: string;
  reachable: boolean | null;
};

const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";

/**
 * Client-safe health/config status. Never returns secrets, the raw model id, or internal
 * URLs. `reachable` stays `null` unless an explicit, controlled probe is requested — the
 * health endpoint does not call the provider API on every request.
 */
export function resolveCareerLlmHealthStatus(env: CareerLlmEnv = process.env): CareerLlmHealthStatus {
  const config = resolveCareerLlmProviderConfig(env);
  return {
    enabled: isCareerLlmEnabled(env),
    provider: config.provider,
    configured: config.configured,
    modelAlias: config.modelAlias,
    reachable: null,
  };
}

/**
 * Controlled reachability probe. Mock is always reachable (no network). For OpenAI it
 * performs a single lightweight, token-free model lookup with an explicit timeout. The
 * API key and model id are never returned; only a boolean reachability flag is exposed.
 */
export async function probeCareerLlmReachable(
  env: CareerLlmEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const provider = resolveCareerLlmProvider(env);
  if (provider === "mock") {
    return true;
  }

  if (!isOpenAiConfigured(env)) {
    return false;
  }

  const model = (env.CAREER_LLM_MODEL ?? "").trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveCareerLlmTimeoutMs(env));

  try {
    const response = await fetchImpl(`${OPENAI_MODELS_URL}/${encodeURIComponent(model)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY ?? ""}` },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function resolveCareerLlmHttpStatus(result: CareerLlmResult): number {
  if (result.status === "blocked") {
    return 403;
  }

  if (result.status === "error") {
    return 500;
  }

  return 200;
}
