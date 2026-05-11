import { gustavoProfile } from "@devflow/applyflow-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateAiText } from "./generate-ai-text.js";

const baseAi = {
  enabled: true,
  provider: "openai" as const,
  model: "gpt-4o-mini",
  maxTokens: 200,
  temperature: 0.2,
};

describe("generateAiText", () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it("IA desactivada — não chama rede", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const r = await generateAiText({
      settings: { version: 1, ai: { ...baseAi, enabled: false, apiKey: "sk-x" } },
      profile: gustavoProfile,
      task: "cover_letter",
      language: "pt",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/desactivada/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sem apiKey — não chama rede", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const r = await generateAiText({
      settings: { version: 1, ai: { ...baseAi, apiKey: undefined } },
      profile: gustavoProfile,
      task: "cover_letter",
      language: "pt",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/API key/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("HTTP 401 devolve mensagem amigável", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const r = await generateAiText({
      settings: { version: 1, ai: { ...baseAi, apiKey: "sk-bad" } },
      profile: gustavoProfile,
      task: "open_answer",
      language: "pt",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/401/);
  });

  it("sucesso repassa texto normalizado", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "  Texto útil  " } }],
      }),
    });

    const r = await generateAiText({
      settings: { version: 1, ai: { ...baseAi, apiKey: "sk-ok" } },
      profile: gustavoProfile,
      task: "fit_summary",
      language: "en",
    });
    expect(r.ok).toBe(true);
    expect(r.text).toBe("Texto útil");
  });
});
