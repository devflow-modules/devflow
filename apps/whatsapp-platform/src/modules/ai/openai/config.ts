/**
 * Configuração OpenAI — 100% env + override por tenant.
 * Nunca hardcode. Suporta tuning por tenant e controle de custo.
 */

function toNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Config base a partir de env — guardrails aplicados. */
const _rawConfig = {
  get model(): string {
    if (typeof window !== "undefined") return "gpt-4o-mini";
    return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  },
  maxTokens: clamp(
    toNumber(process.env.OPENAI_MAX_OUTPUT_TOKENS, 220),
    50,
    500
  ),
  temperature: clamp(
    toNumber(process.env.OPENAI_TEMPERATURE, 0.4),
    0,
    1
  ),
  timeoutMs: clamp(
    toNumber(process.env.OPENAI_TIMEOUT_MS, 10_000),
    3_000,
    20_000
  ),
};

/** Configuração OpenAI padrão — leitura segura de env com limites. */
export const openAiConfig = {
  get apiKey(): string | undefined {
    if (typeof window !== "undefined") return undefined;
    return process.env.OPENAI_API_KEY?.trim() || undefined;
  },
  get model(): string {
    return _rawConfig.model;
  },
  get maxTokens(): number {
    return _rawConfig.maxTokens;
  },
  get temperature(): number {
    return _rawConfig.temperature;
  },
  get timeoutMs(): number {
    if (typeof window !== "undefined") return 10_000;
    return _rawConfig.timeoutMs;
  },
} as const;

/** Compatibilidade com consumers que usam OPENAI_CONFIG. */
export const OPENAI_CONFIG = openAiConfig;

export interface TenantOpenAiOverride {
  model?: string;
  ai_model?: string;
  maxTokens?: number;
  ai_max_tokens?: number;
  temperature?: number;
  ai_temperature?: number;
}

/**
 * Resolve config final: env (default) + override por tenant.
 * Permite tuning por cliente (restaurante vs consultoria vs vendas).
 */
export function resolveOpenAiConfig(tenant?: TenantOpenAiOverride | null) {
  const model =
    tenant?.model ?? tenant?.ai_model ?? openAiConfig.model;
  const maxTokens = clamp(
    tenant?.maxTokens ?? tenant?.ai_max_tokens ?? openAiConfig.maxTokens,
    50,
    500
  );
  const temperature = clamp(
    tenant?.temperature ?? tenant?.ai_temperature ?? openAiConfig.temperature,
    0,
    1
  );
  return {
    model,
    maxTokens,
    temperature,
    timeoutMs: openAiConfig.timeoutMs,
  };
}

export function isOpenAiConfigured(): boolean {
  return !!openAiConfig.apiKey;
}
