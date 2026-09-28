import { beforeEach, describe, expect, it } from "vitest";

import {
  exportApplyFlowSettingsJson,
  getApplyFlowPrivateSettings,
  getApplyFlowPublicSettings,
  getApplyFlowSettings,
  mergeAiSettings,
  sanitizeApplyFlowSettingsForExport,
  saveApplyFlowAiSettingsPatch,
  saveApplyFlowSettings,
} from "./applyflow-storage.js";
import {
  DEFAULT_AI_SETTINGS,
  STORAGE_AI_CREDENTIAL_KEY,
  STORAGE_SETTINGS_KEY,
} from "./storage-types.js";
import { chromeStorageBag } from "../test/chrome-storage-mock.js";

const SECRET = "OPENAI_KEY_SECRET_R2_9281";

describe("applyflow-storage", () => {
  beforeEach(() => {
    chromeStorageBag.clear();
  });

  it("settings default quando não há nada gravado", async () => {
    const s = await getApplyFlowSettings();
    expect(s).toEqual({ version: 1 });
  });

  it("persistência ilegível em storage devolve default", async () => {
    chromeStorageBag.set(STORAGE_SETTINGS_KEY, { version: 2 } as unknown);
    await expect(getApplyFlowSettings()).resolves.toEqual({ version: 1 });
  });

  it("settings customizadas são salvas e retornadas", async () => {
    const incoming = { version: 1 as const, flags: { panel_verbose: false } };
    await saveApplyFlowSettings(incoming);
    await expect(getApplyFlowSettings()).resolves.toEqual(incoming);
  });

  it("mergeAiSettings aplica defaults de IA com provider openai", () => {
    const m = mergeAiSettings(undefined);
    expect(m).toEqual(DEFAULT_AI_SETTINGS);
    expect(m.enabled).toBe(false);
    expect(m.provider).toBe("openai");
  });

  it("sanitizeApplyFlowSettingsForExport mascara apiKey", () => {
    const safe = sanitizeApplyFlowSettingsForExport({
      version: 1,
      ai: {
        enabled: true,
        provider: "openai",
        apiKey: "sk-real-secret",
        model: "gpt-4o-mini",
        maxTokens: 500,
        temperature: 0.4,
      },
    });
    expect(safe.ai?.apiKey).toBe("***");
    const json = exportApplyFlowSettingsJson({
      version: 1,
      ai: {
        enabled: true,
        provider: "openai",
        apiKey: "sk-real-secret",
        model: "gpt-4o-mini",
        maxTokens: 500,
        temperature: 0.4,
      },
    });
    expect(json).not.toContain("sk-real-secret");
  });

  it("export JSON sem chave não inclui placeholder quando apiKey ausente", () => {
    const json = exportApplyFlowSettingsJson({
      version: 1,
      ai: { ...DEFAULT_AI_SETTINGS, enabled: false },
    });
    expect(json).not.toMatch(/sk-/);
  });

  it("public settings never expose plaintext apiKey and do not read credential bag", async () => {
    await saveApplyFlowAiSettingsPatch({
      enabled: true,
      model: "gpt-4o-mini",
      maxTokens: 500,
      temperature: 0.4,
      apiKey: SECRET,
    });
    const pub = await getApplyFlowPublicSettings();
    expect(JSON.stringify(pub)).not.toContain(SECRET);
    expect(pub.ai?.keyConfigured).toBe(true);
    expect(pub.ai).not.toHaveProperty("apiKey");

    const settingsBag = chromeStorageBag.get(STORAGE_SETTINGS_KEY) as Record<string, unknown>;
    expect(JSON.stringify(settingsBag)).not.toContain(SECRET);

    const priv = await getApplyFlowPrivateSettings();
    expect(priv.ai?.apiKey).toBe(SECRET);
    expect(chromeStorageBag.get(STORAGE_AI_CREDENTIAL_KEY)).toMatchObject({
      version: 1,
      apiKey: SECRET,
    });
  });

  it("migrates legacy ai.apiKey from SETTINGS into credential bag without deleting", async () => {
    chromeStorageBag.set(STORAGE_SETTINGS_KEY, {
      version: 1,
      ai: { ...DEFAULT_AI_SETTINGS, enabled: true, apiKey: SECRET },
    });
    const priv = await getApplyFlowPrivateSettings();
    expect(priv.ai?.apiKey).toBe(SECRET);
    expect(chromeStorageBag.get(STORAGE_AI_CREDENTIAL_KEY)).toMatchObject({ apiKey: SECRET });
    const settingsBag = chromeStorageBag.get(STORAGE_SETTINGS_KEY) as { ai?: { apiKey?: string } };
    expect(settingsBag.ai?.apiKey).toBeUndefined();

    const pub = await getApplyFlowPublicSettings();
    expect(pub.ai?.keyConfigured).toBe(true);
    expect(JSON.stringify(pub)).not.toContain(SECRET);
  });

  it("saveApplyFlowAiSettingsPatch preserves existing key when draft omitted", async () => {
    await saveApplyFlowAiSettingsPatch({
      enabled: true,
      model: "gpt-4o-mini",
      maxTokens: 500,
      temperature: 0.4,
      apiKey: SECRET,
    });
    const next = await saveApplyFlowAiSettingsPatch({
      enabled: true,
      model: "gpt-4o-mini",
      maxTokens: 400,
      temperature: 0.3,
      preserveExistingKey: true,
    });
    expect(next.ai?.keyConfigured).toBe(true);
    expect((await getApplyFlowPrivateSettings()).ai?.apiKey).toBe(SECRET);
  });
});
