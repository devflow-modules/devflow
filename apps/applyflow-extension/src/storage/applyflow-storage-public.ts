/**
 * Content-script safe settings — never imports the privileged credential storage key.
 */
import type { ApplyFlowPublicAiSettings, ApplyFlowPublicSettings, ApplyFlowSettings } from "./storage-types.js";
import { DEFAULT_AI_SETTINGS, STORAGE_SETTINGS_KEY } from "./storage-types.js";

function mergePublicAi(raw?: Partial<ApplyFlowPublicAiSettings> & { apiKey?: string }): {
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
  legacyKeyPresent: boolean;
  keyConfiguredFlag?: boolean;
} {
  return {
    enabled: raw?.enabled ?? DEFAULT_AI_SETTINGS.enabled,
    model: raw?.model ?? DEFAULT_AI_SETTINGS.model,
    maxTokens: raw?.maxTokens ?? DEFAULT_AI_SETTINGS.maxTokens,
    temperature: raw?.temperature ?? DEFAULT_AI_SETTINGS.temperature,
    legacyKeyPresent: Boolean(raw?.apiKey?.trim()),
    keyConfiguredFlag:
      typeof (raw as { keyConfigured?: boolean } | undefined)?.keyConfigured === "boolean"
        ? (raw as { keyConfigured: boolean }).keyConfigured
        : undefined,
  };
}

/**
 * Content-script / panel safe settings.
 * Reads ONLY APPLYFLOW_SETTINGS_V1. Never opens the credential bag.
 *
 * If a legacy plaintext apiKey is still on SETTINGS, exposes keyConfigured=true
 * without returning the value. Privileged contexts migrate it into the credential bag.
 */
export async function getApplyFlowPublicSettings(): Promise<ApplyFlowPublicSettings> {
  try {
    const r = await chrome.storage.local.get(STORAGE_SETTINGS_KEY);
    const raw = r[STORAGE_SETTINGS_KEY as keyof typeof r] as ApplyFlowSettings | undefined;
    if (raw?.version !== 1) return { version: 1 };

    const out: ApplyFlowPublicSettings = { version: 1 };
    if (raw.flags) out.flags = { ...raw.flags };
    if (raw.ai) {
      const merged = mergePublicAi(raw.ai as ApplyFlowPublicAiSettings & { apiKey?: string });
      out.ai = {
        enabled: merged.enabled,
        provider: "openai",
        keyConfigured: merged.keyConfiguredFlag ?? merged.legacyKeyPresent,
        model: merged.model,
        maxTokens: merged.maxTokens,
        temperature: merged.temperature,
      };
    }
    return out;
  } catch {
    return { version: 1 };
  }
}
