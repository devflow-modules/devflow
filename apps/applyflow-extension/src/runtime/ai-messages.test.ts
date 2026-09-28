import { gustavoProfile } from "@devflow/applyflow-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleGenerateAiInServiceWorker } from "../background/ai-generate-handler.js";
import {
  GENERATE_AI_MESSAGE,
  GET_PUBLIC_SETTINGS_MESSAGE,
  parseGenerateAiRequest,
  parseGetPublicSettingsRequest,
  parseTestAiRequest,
  TEST_AI_MESSAGE,
} from "./ai-messages.js";
import {
  getApplyFlowPublicSettings,
  saveApplyFlowSettings,
} from "../storage/applyflow-storage.js";
import { chromeStorageBag } from "../test/chrome-storage-mock.js";
import { getAiAuditEntries } from "../storage/ai-audit-storage.js";

const SECRET = "OPENAI_KEY_SECRET_R2_9281";

describe("AF-AI-001 message validation", () => {
  it("rejects GENERATE_AI with credential/network smuggling fields", () => {
    expect(
      parseGenerateAiRequest({
        type: GENERATE_AI_MESSAGE,
        task: "cover_letter",
        language: "pt",
        profile: gustavoProfile,
        apiKey: SECRET,
      }),
    ).toBeNull();
    expect(
      parseGenerateAiRequest({
        type: GENERATE_AI_MESSAGE,
        task: "cover_letter",
        language: "pt",
        profile: gustavoProfile,
        baseURL: "https://evil.example",
      }),
    ).toBeNull();
    expect(
      parseGenerateAiRequest({
        type: GENERATE_AI_MESSAGE,
        task: "cover_letter",
        language: "pt",
        profile: gustavoProfile,
        url: "https://evil.example",
        headers: { Authorization: `Bearer ${SECRET}` },
      }),
    ).toBeNull();
  });

  it("accepts a minimal valid GENERATE_AI request without credentials", () => {
    const parsed = parseGenerateAiRequest({
      type: GENERATE_AI_MESSAGE,
      task: "fit_summary",
      language: "en",
      profile: gustavoProfile,
      jobTitle: "Engineer",
    });
    expect(parsed).not.toBeNull();
    expect(JSON.stringify(parsed)).not.toContain("apiKey");
    expect(JSON.stringify(parsed)).not.toContain(SECRET);
  });

  it("rejects unknown task / language", () => {
    expect(
      parseGenerateAiRequest({
        type: GENERATE_AI_MESSAGE,
        task: "delete_all",
        language: "pt",
        profile: gustavoProfile,
      }),
    ).toBeNull();
  });

  it("GET_PUBLIC_SETTINGS rejects credential fields", () => {
    expect(
      parseGetPublicSettingsRequest({
        type: GET_PUBLIC_SETTINGS_MESSAGE,
        apiKey: true,
      }),
    ).toBeNull();
    expect(parseGetPublicSettingsRequest({ type: GET_PUBLIC_SETTINGS_MESSAGE })).toEqual({
      type: GET_PUBLIC_SETTINGS_MESSAGE,
    });
  });

  it("TEST_AI allows draftApiKey only (options path)", () => {
    const parsed = parseTestAiRequest({
      type: TEST_AI_MESSAGE,
      draftApiKey: SECRET,
      model: "gpt-4o-mini",
    });
    expect(parsed?.draftApiKey).toBe(SECRET);
    expect(
      parseTestAiRequest({
        type: TEST_AI_MESSAGE,
        Authorization: `Bearer ${SECRET}`,
      }),
    ).toBeNull();
  });
});

describe("AF-AI-001 service worker generate path", () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    chromeStorageBag.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  async function seedKey(enabled: boolean, apiKey?: string) {
    await saveApplyFlowSettings({
      version: 1,
      ai: {
        enabled,
        provider: "openai",
        apiKey,
        model: "gpt-4o-mini",
        maxTokens: 200,
        temperature: 0.2,
      },
    });
  }

  it("public settings + generate request/response never expose synthetic key", async () => {
    await seedKey(true, SECRET);
    const pub = await getApplyFlowPublicSettings();
    expect(JSON.stringify(pub)).not.toContain(SECRET);

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "  Safe text  " } }] }),
    });
    globalThis.fetch = fetchSpy;

    const req = parseGenerateAiRequest({
      type: GENERATE_AI_MESSAGE,
      task: "cover_letter",
      language: "pt",
      profile: gustavoProfile,
    });
    expect(req).not.toBeNull();
    expect(JSON.stringify(req)).not.toContain(SECRET);

    const res = await handleGenerateAiInServiceWorker(req!);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.text).toBe("Safe text");
    expect(JSON.stringify(res)).not.toContain(SECRET);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${SECRET}`);
    expect(String(init.body)).not.toContain(SECRET);
  });

  it("AI disabled → zero provider calls + stable error", async () => {
    await seedKey(false, SECRET);
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const req = parseGenerateAiRequest({
      type: GENERATE_AI_MESSAGE,
      task: "cover_letter",
      language: "pt",
      profile: gustavoProfile,
    })!;
    const res = await handleGenerateAiInServiceWorker(req);
    expect(res).toMatchObject({ ok: false, error: "ai_disabled" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("missing key → zero provider calls + ai_key_missing", async () => {
    await seedKey(true, undefined);
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const req = parseGenerateAiRequest({
      type: GENERATE_AI_MESSAGE,
      task: "open_answer",
      language: "en",
      profile: gustavoProfile,
    })!;
    const res = await handleGenerateAiInServiceWorker(req);
    expect(res).toMatchObject({ ok: false, error: "ai_key_missing" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("provider errors do not echo Authorization or key", async () => {
    await seedKey(true, SECRET);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: `bad ${SECRET}` } }),
    });
    const req = parseGenerateAiRequest({
      type: GENERATE_AI_MESSAGE,
      task: "fit_summary",
      language: "pt",
      profile: gustavoProfile,
    })!;
    const res = await handleGenerateAiInServiceWorker(req);
    expect(res.ok).toBe(false);
    expect(JSON.stringify(res)).not.toContain(SECRET);
    expect(JSON.stringify(res)).not.toMatch(/Bearer/i);
  });

  it("concurrent GENERATE_AI correlates responses without mixing", async () => {
    await seedKey(true, SECRET);
    let call = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      const n = ++call;
      await new Promise((r) => setTimeout(r, n === 1 ? 30 : 5));
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: `out-${n}` } }] }),
      };
    });

    const base = {
      type: GENERATE_AI_MESSAGE,
      language: "pt" as const,
      profile: gustavoProfile,
    };
    const [a, b] = await Promise.all([
      handleGenerateAiInServiceWorker(
        parseGenerateAiRequest({ ...base, task: "cover_letter", jobTitle: "A" })!,
      ),
      handleGenerateAiInServiceWorker(
        parseGenerateAiRequest({ ...base, task: "fit_summary", jobTitle: "B" })!,
      ),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(new Set([a.text, b.text])).toEqual(new Set(["out-1", "out-2"]));
    }
  });

  it("audit storage never gains apiKey / Authorization", async () => {
    await seedKey(true, SECRET);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });
    await handleGenerateAiInServiceWorker(
      parseGenerateAiRequest({
        type: GENERATE_AI_MESSAGE,
        task: "cover_letter",
        language: "pt",
        profile: gustavoProfile,
      })!,
    );
    const entries = await getAiAuditEntries();
    expect(JSON.stringify(entries)).not.toContain(SECRET);
    expect(JSON.stringify(entries)).not.toMatch(/Authorization|Bearer/i);
  });
});
