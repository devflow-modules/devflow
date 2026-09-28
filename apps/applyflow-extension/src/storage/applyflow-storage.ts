import type {
  ApplyFlowAiCredential,
  ApplyFlowAiSettings,
  ApplyFlowPublicAiSettings,
  ApplyFlowPublicSettings,
  ApplyFlowSettings,
} from "./storage-types.js";
import {
  DEFAULT_AI_SETTINGS,
  STORAGE_AI_CREDENTIAL_KEY,
  STORAGE_SETTINGS_KEY,
} from "./storage-types.js";

const DEFAULT: ApplyFlowSettings = { version: 1 };

export function mergeAiSettings(raw?: Partial<ApplyFlowAiSettings>): ApplyFlowAiSettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    ...raw,
    provider: "openai",
  };
}

/** Build public AI view from non-secret fields + keyConfigured flag (never reads apiKey). */
export function toPublicAiSettingsFromStored(args: {
  ai?: Partial<ApplyFlowAiSettings> & { keyConfigured?: boolean };
  keyConfigured: boolean;
}): ApplyFlowPublicAiSettings {
  const ai = mergeAiSettings(args.ai);
  return {
    enabled: ai.enabled,
    provider: "openai",
    keyConfigured: args.keyConfigured,
    model: ai.model,
    maxTokens: ai.maxTokens,
    temperature: ai.temperature,
  };
}

/** @deprecated Prefer toPublicAiSettingsFromStored — this still inspects apiKey for legacy callers. */
export function toPublicAiSettings(raw?: Partial<ApplyFlowAiSettings>): ApplyFlowPublicAiSettings {
  const ai = mergeAiSettings(raw);
  return {
    enabled: ai.enabled,
    provider: "openai",
    keyConfigured: Boolean(ai.apiKey?.trim()),
    model: ai.model,
    maxTokens: ai.maxTokens,
    temperature: ai.temperature,
  };
}

export function toPublicSettings(
  s: ApplyFlowSettings,
  keyConfigured?: boolean,
): ApplyFlowPublicSettings {
  const out: ApplyFlowPublicSettings = { version: 1 };
  if (s.flags) out.flags = { ...s.flags };
  if (s.ai || keyConfigured !== undefined) {
    out.ai = toPublicAiSettingsFromStored({
      ai: s.ai,
      keyConfigured: keyConfigured ?? Boolean(s.ai?.apiKey?.trim()),
    });
  }
  return out;
}

/** Settings para exportação — nunca inclui apiKey em claro. */
export function sanitizeApplyFlowSettingsForExport(
  s: ApplyFlowSettings,
  keyConfigured = Boolean(s.ai?.apiKey?.trim()),
): ApplyFlowSettings {
  const out: ApplyFlowSettings = { version: 1 };
  if (s.flags) out.flags = { ...s.flags };
  if (s.ai) {
    const ai = mergeAiSettings(s.ai);
    out.ai = {
      ...ai,
      apiKey: keyConfigured ? "***" : undefined,
    };
  }
  return out;
}

export function exportApplyFlowSettingsJson(
  settings: ApplyFlowSettings,
  keyConfigured?: boolean,
): string {
  return JSON.stringify(sanitizeApplyFlowSettingsForExport(settings, keyConfigured), null, 2);
}

async function readSettingsBag(): Promise<ApplyFlowSettings> {
  try {
    const r = await chrome.storage.local.get(STORAGE_SETTINGS_KEY);
    const raw = r[STORAGE_SETTINGS_KEY as keyof typeof r] as ApplyFlowSettings | undefined;
    return raw?.version === 1 ? raw : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

async function readCredentialBag(): Promise<ApplyFlowAiCredential> {
  try {
    const r = await chrome.storage.local.get(STORAGE_AI_CREDENTIAL_KEY);
    const raw = r[STORAGE_AI_CREDENTIAL_KEY as keyof typeof r] as ApplyFlowAiCredential | undefined;
    if (raw?.version === 1) return raw;
  } catch {
    /* ignore */
  }
  return { version: 1 };
}

async function writeCredentialBag(apiKey: string | undefined): Promise<void> {
  if (apiKey?.trim()) {
    await chrome.storage.local.set({
      [STORAGE_AI_CREDENTIAL_KEY]: { version: 1, apiKey: apiKey.trim() } satisfies ApplyFlowAiCredential,
    });
  } else {
    await chrome.storage.local.remove(STORAGE_AI_CREDENTIAL_KEY);
  }
}

/**
 * One-shot migration: move legacy `ai.apiKey` from SETTINGS into CREDENTIAL bag
 * and rewrite SETTINGS without the plaintext key. Never deletes the key.
 */
async function migrateLegacyApiKeyIfNeeded(settings: ApplyFlowSettings): Promise<{
  settings: ApplyFlowSettings;
  apiKey: string | undefined;
}> {
  const legacyKey = settings.ai?.apiKey?.trim() || undefined;
  const cred = await readCredentialBag();
  const existingCred = cred.apiKey?.trim() || undefined;

  if (!legacyKey) {
    return { settings, apiKey: existingCred };
  }

  const apiKey = existingCred || legacyKey;
  await writeCredentialBag(apiKey);

  const { apiKey: _removed, ...aiRest } = mergeAiSettings(settings.ai);
  void _removed;
  const cleaned: ApplyFlowSettings & { ai?: ApplyFlowAiSettings & { keyConfigured?: boolean } } = {
    ...settings,
    version: 1,
    ai: { ...aiRest, provider: "openai", keyConfigured: Boolean(apiKey) },
  };
  await chrome.storage.local.set({ [STORAGE_SETTINGS_KEY]: cleaned });
  return { settings: cleaned, apiKey };
}

/**
 * Content-script / panel safe settings.
 * Implementation lives in applyflow-storage-public.ts so the content bundle
 * never imports STORAGE_AI_CREDENTIAL_KEY (AF-AI-001).
 */
export { getApplyFlowPublicSettings } from "./applyflow-storage-public.js";

/**
 * Full settings including plaintext apiKey (merged from credential bag).
 * PRIVILEGED ONLY — service worker / options page.
 * Content scripts must use getApplyFlowPublicSettings().
 */
export async function getApplyFlowPrivateSettings(): Promise<ApplyFlowSettings> {
  const raw = await readSettingsBag();
  const { settings, apiKey } = await migrateLegacyApiKeyIfNeeded(raw);
  return {
    ...settings,
    version: 1,
    ai: settings.ai
      ? { ...mergeAiSettings(settings.ai), apiKey }
      : apiKey
        ? { ...DEFAULT_AI_SETTINGS, apiKey }
        : undefined,
  };
}

/**
 * @deprecated Prefer getApplyFlowPrivateSettings (privileged) or getApplyFlowPublicSettings (content).
 */
export async function getApplyFlowSettings(): Promise<ApplyFlowSettings> {
  return getApplyFlowPrivateSettings();
}

/**
 * Persist public settings shape WITHOUT apiKey. Use saveApplyFlowAiSettingsPatch for AI writes.
 */
export async function saveApplyFlowSettings(settings: ApplyFlowSettings): Promise<void> {
  const ai = settings.ai ? mergeAiSettings(settings.ai) : undefined;
  const hasKeyField = Boolean(settings.ai && "apiKey" in settings.ai);
  if (hasKeyField) {
    await writeCredentialBag(settings.ai?.apiKey?.trim() || undefined);
  }
  const cred = await readCredentialBag();
  const keyConfigured = Boolean(cred.apiKey?.trim());
  const payload: ApplyFlowSettings & { ai?: ApplyFlowAiSettings & { keyConfigured?: boolean } } = {
    version: 1,
    flags: settings.flags,
    ai: ai
      ? {
          enabled: ai.enabled,
          provider: "openai",
          model: ai.model,
          maxTokens: ai.maxTokens,
          temperature: ai.temperature,
          keyConfigured,
        }
      : undefined,
  };
  await chrome.storage.local.set({ [STORAGE_SETTINGS_KEY]: payload });
}

/**
 * Patch AI settings. Credential writes go to STORAGE_AI_CREDENTIAL_KEY.
 * Public SETTINGS stores keyConfigured boolean only.
 */
export async function saveApplyFlowAiSettingsPatch(args: {
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey?: string;
  preserveExistingKey?: boolean;
}): Promise<ApplyFlowPublicSettings> {
  const cur = await readSettingsBag();
  const cred = await readCredentialBag();
  let nextKey: string | undefined;
  if (args.apiKey !== undefined) {
    nextKey = args.apiKey.trim() || undefined;
  } else if (args.preserveExistingKey) {
    // Prefer credential bag; fall back to legacy SETTINGS field before migrate.
    nextKey = cred.apiKey?.trim() || cur.ai?.apiKey?.trim() || undefined;
  } else {
    nextKey = undefined;
  }

  await writeCredentialBag(nextKey);

  const publicAi = {
    enabled: args.enabled,
    provider: "openai" as const,
    model: args.model.trim() || DEFAULT_AI_SETTINGS.model,
    maxTokens: Math.min(4096, Math.max(64, Math.round(Number(args.maxTokens)) || DEFAULT_AI_SETTINGS.maxTokens)),
    temperature: Math.min(2, Math.max(0, Number(args.temperature) || DEFAULT_AI_SETTINGS.temperature)),
    keyConfigured: Boolean(nextKey),
  };

  const next: ApplyFlowSettings & { ai?: ApplyFlowAiSettings & { keyConfigured?: boolean } } = {
    ...cur,
    version: 1,
    ai: {
      enabled: publicAi.enabled,
      provider: "openai",
      model: publicAi.model,
      maxTokens: publicAi.maxTokens,
      temperature: publicAi.temperature,
      keyConfigured: publicAi.keyConfigured,
    },
  };
  await chrome.storage.local.set({ [STORAGE_SETTINGS_KEY]: next });

  return {
    version: 1,
    flags: next.flags,
    ai: {
      enabled: publicAi.enabled,
      provider: "openai",
      keyConfigured: publicAi.keyConfigured,
      model: publicAi.model,
      maxTokens: publicAi.maxTokens,
      temperature: publicAi.temperature,
    },
  };
}
