/**
 * Consolidated, client-safe view of Career Suite feature flags.
 *
 * Only booleans and a non-secret provider alias are exposed. Flag *values* that are secrets
 * (API keys, base URLs) are never included. Every external integration is default-off, the
 * automation provider stays `mock`, and OpenClaw stays disabled.
 */
export type CareerFeatureFlagsEnv = {
  CAREER_AGENTS_ENABLED?: string;
  LIBRECHAT_ADAPTER_ENABLED?: string;
  LIBRECHAT_TRANSPORT_ENABLED?: string;
  CAREER_LLM_ENABLED?: string;
  CAREER_LLM_PROVIDER?: string;
  CAREER_AUTOMATION_ENABLED?: string;
  CAREER_AUTOMATION_PROVIDER?: string;
  OPENCLAW_ENABLED?: string;
  CAREER_PILOT_MODE?: string;
};

export type CareerFeatureFlags = {
  careerAgentsEnabled: boolean;
  librechatAdapterEnabled: boolean;
  librechatTransportEnabled: boolean;
  careerLlmEnabled: boolean;
  careerLlmProvider: "mock" | "openai";
  careerAutomationEnabled: boolean;
  careerAutomationProvider: "mock" | "openclaw";
  openClawEnabled: boolean;
  pilotMode: boolean;
};

function isTrue(value: string | undefined): boolean {
  return value === "true";
}

/**
 * Career agents are the deterministic core and are on unless explicitly disabled. Every other
 * flag is opt-in (default-off). The LLM and automation providers default to `mock`.
 */
export function resolveCareerFeatureFlags(
  env: CareerFeatureFlagsEnv = process.env,
): CareerFeatureFlags {
  return {
    careerAgentsEnabled: env.CAREER_AGENTS_ENABLED !== "false",
    librechatAdapterEnabled: isTrue(env.LIBRECHAT_ADAPTER_ENABLED),
    librechatTransportEnabled: isTrue(env.LIBRECHAT_TRANSPORT_ENABLED),
    careerLlmEnabled: isTrue(env.CAREER_LLM_ENABLED),
    careerLlmProvider: env.CAREER_LLM_PROVIDER === "openai" ? "openai" : "mock",
    careerAutomationEnabled: isTrue(env.CAREER_AUTOMATION_ENABLED),
    careerAutomationProvider: env.CAREER_AUTOMATION_PROVIDER === "openclaw" ? "openclaw" : "mock",
    openClawEnabled: isTrue(env.OPENCLAW_ENABLED),
    pilotMode: isTrue(env.CAREER_PILOT_MODE),
  };
}

/**
 * Client-safe pilot flag for the browser. Driven by `NEXT_PUBLIC_CAREER_PILOT_MODE` so the UI
 * can render the pilot badge without importing server-side env.
 */
export function isCareerPilotModeClient(
  value: string | undefined = process.env.NEXT_PUBLIC_CAREER_PILOT_MODE,
): boolean {
  return value === "true";
}
