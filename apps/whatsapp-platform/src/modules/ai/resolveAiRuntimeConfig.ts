import { openAiConfig } from "@/modules/ai/openai";
import { tenantDriverToProviderKind, type AiProviderKind } from "@/modules/ai/aiProvider";
import type { AiRuntimeExecution } from "./aiConfigTypes";

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Resolve driver efetivo: override por tenant na config, senão coluna Tenant.
 */
export function resolveEffectiveDriver(
  tenantAiDriver: string | null | undefined,
  configRuntimeDriver: string | null | undefined
): string | null {
  const d = configRuntimeDriver?.trim() || tenantAiDriver?.trim() || null;
  return d || null;
}

/**
 * Merge de defaults globais (env) com overrides seguros do tenant.
 */
export function resolveAiRuntimeExecution(params: {
  tenantAiDriver: string | null | undefined;
  configRuntimeDriver: string | null | undefined;
  model: string | null | undefined;
  maxTokens: number | null | undefined;
  temperature: number | null | undefined;
}): AiRuntimeExecution {
  const driver = resolveEffectiveDriver(params.tenantAiDriver, params.configRuntimeDriver) ?? "ruleBased";
  const kind: AiProviderKind | null =
    driver === "openAI" || driver === "claude" ? tenantDriverToProviderKind(driver) : null;

  const model =
    (params.model?.trim() || openAiConfig.model).trim() || openAiConfig.model;
  const maxTokens = clamp(params.maxTokens ?? openAiConfig.maxTokens, 50, 500);
  const temperature = clamp(params.temperature ?? openAiConfig.temperature, 0, 1);
  const timeoutMs = openAiConfig.timeoutMs;

  return {
    driver,
    providerKind: kind,
    model,
    maxTokens,
    temperature,
    timeoutMs,
  };
}
