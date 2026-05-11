export const STORAGE_PROFILE_KEY = "APPLYFLOW_PROFILE_V1" as const;
export const STORAGE_SETTINGS_KEY = "APPLYFLOW_SETTINGS_V1" as const;
export const STORAGE_AUTOFILL_AUDIT_KEY = "APPLYFLOW_AUTOFILL_AUDIT_V1" as const;
export const STORAGE_APPLICATIONS_KEY = "APPLYFLOW_APPLICATIONS_V1" as const;
export const STORAGE_AI_AUDIT_KEY = "APPLYFLOW_AI_AUDIT_V1" as const;

export type ApplyFlowAiSettings = {
  enabled: boolean;
  provider: "openai";
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
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
