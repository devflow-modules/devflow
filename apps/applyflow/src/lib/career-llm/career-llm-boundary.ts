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
  OPENAI_API_KEY?: string;
};

export function isCareerLlmEnabled(env: CareerLlmEnv = process.env): boolean {
  return env.CAREER_LLM_ENABLED === "true";
}

export function resolveCareerLlmProvider(env: CareerLlmEnv = process.env): CareerLlmProvider {
  return env.CAREER_LLM_PROVIDER === "openai" ? "openai" : "mock";
}

/**
 * Resolves a server-owned provider config. Secrets stay server-side and are never returned.
 */
export function resolveCareerLlmProviderConfig(
  env: CareerLlmEnv = process.env,
): CareerLlmProviderConfig {
  const provider = resolveCareerLlmProvider(env);

  if (provider === "openai") {
    return {
      provider: "openai",
      modelAlias: CAREER_LLM_DEFAULT_MODEL_ALIAS.replace("mock", "openai"),
      temperature: 0,
      maxOutputTokens: 1024,
      timeoutMs: 20000,
      configured: typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.length > 0,
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
      model: env.CAREER_LLM_MODEL ?? "gpt-4o-mini",
      modelAlias: config.modelAlias,
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

export function resolveCareerLlmHttpStatus(result: CareerLlmResult): number {
  if (result.status === "blocked") {
    return 403;
  }

  if (result.status === "error") {
    return 500;
  }

  return 200;
}
