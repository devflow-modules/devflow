import type { ApplyFlowAiSettings, ApplyFlowSettings } from "./storage-types.js";
import { DEFAULT_AI_SETTINGS, STORAGE_SETTINGS_KEY } from "./storage-types.js";

const DEFAULT: ApplyFlowSettings = { version: 1 };

export function mergeAiSettings(raw?: Partial<ApplyFlowAiSettings>): ApplyFlowAiSettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    ...raw,
    provider: "openai",
  };
}

/** Settings para exportação — nunca inclui apiKey em claro. */
export function sanitizeApplyFlowSettingsForExport(s: ApplyFlowSettings): ApplyFlowSettings {
  const out: ApplyFlowSettings = { version: 1 };
  if (s.flags) out.flags = { ...s.flags };
  if (s.ai) {
    const ai = mergeAiSettings(s.ai);
    out.ai = {
      ...ai,
      apiKey: s.ai.apiKey?.trim() ? "***" : undefined,
    };
  }
  return out;
}

export function exportApplyFlowSettingsJson(settings: ApplyFlowSettings): string {
  return JSON.stringify(sanitizeApplyFlowSettingsForExport(settings), null, 2);
}

export async function getApplyFlowSettings(): Promise<ApplyFlowSettings> {
  try {
    const r = await chrome.storage.local.get(STORAGE_SETTINGS_KEY);
    const raw = r[STORAGE_SETTINGS_KEY as keyof typeof r] as ApplyFlowSettings | undefined;
    return raw?.version === 1 ? raw : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function saveApplyFlowSettings(settings: ApplyFlowSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_SETTINGS_KEY]: settings });
}
