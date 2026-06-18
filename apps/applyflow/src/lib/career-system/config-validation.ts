import {
  isCareerLlmEnabled,
  resolveCareerLlmProvider,
  resolveCareerLlmProviderConfig,
} from "../career-llm/career-llm-boundary";
import {
  isCareerAutomationEnabled,
  resolveCareerAutomationProvider,
  resolveCareerAutomationProviderConfig,
} from "../career-automation/career-automation-boundary";
import { isLibreChatAdapterEnabled } from "../career-chat/career-chat-librechat-boundary";
import {
  isLibreChatTransportEnabled,
  resolveLibreChatTransportConfig,
} from "../career-chat/librechat-transport/config";
import {
  careerEnvironmentRequiresStrictConfig,
  resolveCareerRuntimeEnvironment,
  type CareerRuntimeEnvironment,
} from "./environment";
import { resolveCareerFeatureFlags } from "./feature-flags";

/**
 * Centralized, server-side configuration validation for every Career Suite component.
 *
 * The result is intentionally narrow and client-safe: it never includes API keys, tokens,
 * Authorization headers, private base URLs, provider ids, or raw env values. It only reports
 * whether a component is enabled, configured, required, and a coarse status.
 */
export type CareerComponentName =
  | "career_agents"
  | "career_chat"
  | "career_llm"
  | "career_automation"
  | "provider_metadata"
  | "database";

export type CareerComponentStatusValue = "ready" | "disabled" | "misconfigured";

export type CareerComponentStatus = {
  component: CareerComponentName;
  enabled: boolean;
  configured: boolean;
  required: boolean;
  status: CareerComponentStatusValue;
  errorCode?: string;
};

export type CareerConfigEnv = {
  CAREER_AGENTS_ENABLED?: string;
  NANGO_SECRET_KEY?: string;
  CAREER_PROVIDER_RUNTIME_ENABLED?: string;
  NANGO_RUNTIME_ENABLED?: string;
  GMAIL_PROVIDER_ENABLED?: string;
  CALENDAR_PROVIDER_ENABLED?: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
};

function deriveStatus(input: {
  enabled: boolean;
  configured: boolean;
}): CareerComponentStatusValue {
  if (!input.enabled) {
    return "disabled";
  }
  return input.configured ? "ready" : "misconfigured";
}

function buildComponent(input: {
  component: CareerComponentName;
  enabled: boolean;
  configured: boolean;
  required: boolean;
  misconfiguredCode: string;
}): CareerComponentStatus {
  const status = deriveStatus(input);
  const base: CareerComponentStatus = {
    component: input.component,
    enabled: input.enabled,
    configured: input.configured,
    required: input.required,
    status,
  };
  if (status === "misconfigured") {
    base.errorCode = input.misconfiguredCode;
  }
  return base;
}

/**
 * Validates every component for the current environment. An enabled-but-misconfigured
 * component is always reported as `misconfigured` (never partially started). Optional config
 * that is absent simply keeps the feature `disabled`.
 */
export function resolveCareerComponentStatuses(
  env: CareerConfigEnv = process.env,
): CareerComponentStatus[] {
  const flags = resolveCareerFeatureFlags(env);

  // Career agents — deterministic core. On unless explicitly disabled; no external config.
  const agents = buildComponent({
    component: "career_agents",
    enabled: flags.careerAgentsEnabled,
    configured: true,
    required: true,
    misconfiguredCode: "career_agents_misconfigured",
  });

  // Career chat — deterministic adapter. The optional real transport must be configured when
  // the transport flag is on.
  const adapterEnabled = isLibreChatAdapterEnabled(env);
  const transportEnabled = isLibreChatTransportEnabled(env);
  const transportConfig = resolveLibreChatTransportConfig(env);
  const chatConfigured = !transportEnabled || transportConfig.configured;
  const chat = buildComponent({
    component: "career_chat",
    enabled: adapterEnabled || transportEnabled,
    configured: chatConfigured,
    required: false,
    misconfiguredCode: "librechat_transport_misconfigured",
  });

  // Career LLM — mock by default; openai must have key + model.
  const llmConfig = resolveCareerLlmProviderConfig(env);
  const llm = buildComponent({
    component: "career_llm",
    enabled: isCareerLlmEnabled(env),
    configured: llmConfig.configured,
    required: false,
    misconfiguredCode:
      resolveCareerLlmProvider(env) === "openai"
        ? "career_llm_openai_not_configured"
        : "career_llm_misconfigured",
  });

  // Career automation — mock by default; openclaw must have key + base url.
  const automationConfig = resolveCareerAutomationProviderConfig(env);
  const automation = buildComponent({
    component: "career_automation",
    enabled: isCareerAutomationEnabled(env),
    configured: automationConfig.configured,
    required: false,
    misconfiguredCode:
      resolveCareerAutomationProvider(env) === "openclaw"
        ? "career_automation_openclaw_not_configured"
        : "career_automation_misconfigured",
  });

  // Provider metadata (Nango Gmail/Calendar) — opt-in; needs a server-side secret when on.
  const providerRuntimeEnabled =
    env.CAREER_PROVIDER_RUNTIME_ENABLED === "true" || env.NANGO_RUNTIME_ENABLED === "true";
  const providerSecretPresent =
    typeof env.NANGO_SECRET_KEY === "string" && env.NANGO_SECRET_KEY.length > 0;
  const providerMetadata = buildComponent({
    component: "provider_metadata",
    enabled: providerRuntimeEnabled,
    configured: providerSecretPresent,
    required: false,
    misconfiguredCode: "provider_metadata_not_configured",
  });

  // Database — optional for the local-first Career Suite. Considered configured only when a
  // connection string is present; otherwise it stays disabled (career suite runs in-memory).
  const databasePresent = typeof env.DATABASE_URL === "string" && env.DATABASE_URL.length > 0;
  const database = buildComponent({
    component: "database",
    enabled: databasePresent,
    configured: databasePresent,
    required: false,
    misconfiguredCode: "database_not_configured",
  });

  return [agents, chat, llm, automation, providerMetadata, database];
}

/**
 * In production, a required component that is enabled but misconfigured is a hard failure.
 * Returns the list of components that block a safe production start.
 */
export function resolveCareerConfigBlockers(
  env: CareerConfigEnv = process.env,
  environment: CareerRuntimeEnvironment = resolveCareerRuntimeEnvironment(env),
): CareerComponentStatus[] {
  const statuses = resolveCareerComponentStatuses(env);
  const strict = careerEnvironmentRequiresStrictConfig(environment);

  return statuses.filter((component) => {
    if (component.status !== "misconfigured") {
      return false;
    }
    // A misconfigured required component always blocks. In strict (production) environments,
    // any enabled-but-misconfigured component blocks, since it must not start partially.
    return component.required || strict;
  });
}
