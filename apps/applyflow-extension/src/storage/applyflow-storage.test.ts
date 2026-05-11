import { beforeEach, describe, expect, it } from "vitest";

import {
  exportApplyFlowSettingsJson,
  getApplyFlowSettings,
  mergeAiSettings,
  sanitizeApplyFlowSettingsForExport,
  saveApplyFlowSettings,
} from "./applyflow-storage.js";
import { DEFAULT_AI_SETTINGS, STORAGE_SETTINGS_KEY } from "./storage-types.js";
import { chromeStorageBag } from "../test/chrome-storage-mock.js";

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
});
