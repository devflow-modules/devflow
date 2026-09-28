export const STORAGE_PROFILE_KEY = "APPLYFLOW_PROFILE_V1" as const;
export const STORAGE_SETTINGS_KEY = "APPLYFLOW_SETTINGS_V1" as const;
/**
 * Privileged OpenAI credential bag — service worker / options only.
 * Content scripts must never import or read this key (AF-AI-001).
 */
export const STORAGE_AI_CREDENTIAL_KEY = "APPLYFLOW_AI_CREDENTIAL_V1" as const;
export const STORAGE_AUTOFILL_AUDIT_KEY = "APPLYFLOW_AUTOFILL_AUDIT_V1" as const;
export const STORAGE_APPLICATIONS_KEY = "APPLYFLOW_APPLICATIONS_V1" as const;
export const STORAGE_AI_AUDIT_KEY = "APPLYFLOW_AI_AUDIT_V1" as const;

export type ApplyFlowAiCredential = {
  version: 1;
  apiKey?: string;
};

export type ApplyFlowAiSettings = {
  enabled: boolean;
  provider: "openai";
  /** @deprecated Legacy field on SETTINGS; migrated to STORAGE_AI_CREDENTIAL_KEY. */
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
};

/**
 * Content-script / panel facing AI settings — NEVER includes plaintext apiKey.
 * `keyConfigured` is a boolean capability signal only.
 */
export type ApplyFlowPublicAiSettings = {
  enabled: boolean;
  provider: "openai";
  keyConfigured: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
};

export type ApplyFlowPublicSettings = {
  version: 1;
  flags?: Record<string, boolean>;
  ai?: ApplyFlowPublicAiSettings;
};

export const DEFAULT_AI_SETTINGS: ApplyFlowAiSettings = {
  enabled: false,
  provider: "openai",
  model: "gpt-4o-mini",
  maxTokens: 500,
  temperature: 0.4,
};

export type ApplyFlowSettings = {
  version: 1;
  /** Reservado para flags locais (sem PII); chaves apenas alfanuméricas recomendadas. */
  flags?: Record<string, boolean>;
  ai?: ApplyFlowAiSettings;
};
