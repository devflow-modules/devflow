import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAiAnswerReviewProvider } from "./ai-provider";
import { postOpenAiChatJsonCompletion } from "./openai-chat-json";
import {
  ProviderError,
  classifyProviderHttpStatus,
  providerErrorUserMessage,
  toUserFacingReviewError,
} from "./provider-error";

const ADVERSARIAL_BODY = "OPENAI_RAW_PROVIDER_SECRET_R3_7319";
const SYNTHETIC_KEY = "OPENAI_KEY_R3_SECRET_9287";

function assertNoLeakage(value: unknown): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  expect(serialized).not.toContain(ADVERSARIAL_BODY);
  expect(serialized).not.toContain(SYNTHETIC_KEY);
}

function mockFetchResponse(opts: {
  ok: boolean;
  status: number;
  body: string;
}): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: opts.ok,
      status: opts.status,
      text: async () => opts.body,
    }),
  );
}

describe("classifyProviderHttpStatus", () => {
  it("maps auth, rate limit, unavailable, and generic failures", () => {
    expect(classifyProviderHttpStatus(401)).toBe("provider_auth_failed");
    expect(classifyProviderHttpStatus(403)).toBe("provider_auth_failed");
    expect(classifyProviderHttpStatus(429)).toBe("provider_rate_limited");
    expect(classifyProviderHttpStatus(500)).toBe("provider_unavailable");
    expect(classifyProviderHttpStatus(502)).toBe("provider_unavailable");
    expect(classifyProviderHttpStatus(503)).toBe("provider_unavailable");
    expect(classifyProviderHttpStatus(400)).toBe("provider_error");
    expect(classifyProviderHttpStatus(418)).toBe("provider_error");
  });
});

describe("postOpenAiChatJsonCompletion — AF-AI-002 sanitization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns assistant content from a successful response", async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      body: JSON.stringify({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });
    const content = await postOpenAiChatJsonCompletion({
      apiKey: SYNTHETIC_KEY,
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "u" },
      ],
    });
    expect(content).toBe('{"ok":true}');
  });

  it("throws when key is empty", async () => {
    await expect(
      postOpenAiChatJsonCompletion({
        apiKey: "   ",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toThrow(/empty/);
  });

  it.each([
    [400, "provider_error"],
    [401, "provider_auth_failed"],
    [403, "provider_auth_failed"],
    [429, "provider_rate_limited"],
    [500, "provider_unavailable"],
    [502, "provider_unavailable"],
    [503, "provider_unavailable"],
  ] as const)(
    "HTTP %i → %s without leaking provider body or API key",
    async (status, code) => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockFetchResponse({
        ok: false,
        status,
        body: JSON.stringify({
          error: { message: ADVERSARIAL_BODY, type: "invalid_request_error" },
        }),
      });

      let caught: unknown;
      try {
        await postOpenAiChatJsonCompletion({
          apiKey: SYNTHETIC_KEY,
          messages: [{ role: "user", content: "x" }],
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(ProviderError);
      const err = caught as ProviderError;
      expect(err.code).toBe(code);
      expect(err.status).toBe(status);
      expect(err.message).toBe(code);
      assertNoLeakage(err.message);
      assertNoLeakage(err.code);
      assertNoLeakage(toUserFacingReviewError(err));
      assertNoLeakage(providerErrorUserMessage(err.code));

      for (const call of [...consoleSpy.mock.calls, ...warnSpy.mock.calls, ...logSpy.mock.calls]) {
        assertNoLeakage(call);
      }

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
      logSpy.mockRestore();
    },
  );

  it("maps AbortError to provider_timeout without leaking secrets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })),
    );

    let caught: unknown;
    try {
      await postOpenAiChatJsonCompletion({
        apiKey: SYNTHETIC_KEY,
        messages: [{ role: "user", content: "x" }],
        signal: AbortSignal.abort(),
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).code).toBe("provider_timeout");
    assertNoLeakage(toUserFacingReviewError(caught));
  });

  it("does not classify generic network errors as timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(
      postOpenAiChatJsonCompletion({
        apiKey: SYNTHETIC_KEY,
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toMatchObject({ code: "provider_error" });
  });

  it("HTTP 200 invalid JSON → provider_invalid_response", async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      body: `not-json ${ADVERSARIAL_BODY}`,
    });

    let caught: unknown;
    try {
      await postOpenAiChatJsonCompletion({
        apiKey: SYNTHETIC_KEY,
        messages: [{ role: "user", content: "x" }],
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).code).toBe("provider_invalid_response");
    assertNoLeakage(toUserFacingReviewError(caught));
  });

  it("HTTP 200 empty body → provider_invalid_response", async () => {
    mockFetchResponse({ ok: true, status: 200, body: "" });

    await expect(
      postOpenAiChatJsonCompletion({
        apiKey: SYNTHETIC_KEY,
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toMatchObject({ code: "provider_invalid_response" });
  });

  it("HTTP 200 missing choices content → provider_invalid_response", async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      body: JSON.stringify({ choices: [{ message: {} }], error: ADVERSARIAL_BODY }),
    });

    let caught: unknown;
    try {
      await postOpenAiChatJsonCompletion({
        apiKey: SYNTHETIC_KEY,
        messages: [{ role: "user", content: "x" }],
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).code).toBe("provider_invalid_response");
    assertNoLeakage(toUserFacingReviewError(caught));
  });

  it("Authorization header may contain synthetic key only on the outbound request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: '{"score":1}' } }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await postOpenAiChatJsonCompletion({
      apiKey: SYNTHETIC_KEY,
      messages: [{ role: "user", content: "x" }],
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${SYNTHETIC_KEY}`);
  });
});

describe("createOpenAiAnswerReviewProvider — invalid review shape", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps wrong JSON shape to provider_invalid_response without leaking model text", async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                garbage: true,
                leak: ADVERSARIAL_BODY,
              }),
            },
          },
        ],
      }),
    });

    const provider = createOpenAiAnswerReviewProvider(SYNTHETIC_KEY);
    let caught: unknown;
    try {
      await provider.review({ userAnswer: "I led a project with clear results." });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).code).toBe("provider_invalid_response");
    assertNoLeakage(toUserFacingReviewError(caught));
    assertNoLeakage((caught as Error).message);
  });

  it("still returns a valid review on success (regression)", async () => {
    const valid = {
      score: 7,
      strengths: ["Clear structure"],
      improvements: ["Add metrics"],
      improvedVersion: "I led X and delivered Y, measured by Z.",
      englishNotes: "Prefer strong verbs.",
      followUpPrompt: "Practice a 60-second STAR.",
    };
    mockFetchResponse({
      ok: true,
      status: 200,
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
    });

    const provider = createOpenAiAnswerReviewProvider(SYNTHETIC_KEY);
    const out = await provider.review({ userAnswer: "I led a project with clear results." });
    expect(out.score).toBe(7);
    expect(out.improvedVersion).toContain("delivered");
  });
});

describe("toUserFacingReviewError", () => {
  it("maps each provider code to a controlled message", () => {
    const codes = [
      "provider_auth_failed",
      "provider_rate_limited",
      "provider_timeout",
      "provider_unavailable",
      "provider_invalid_response",
      "provider_error",
    ] as const;

    for (const code of codes) {
      const msg = toUserFacingReviewError(new ProviderError(code));
      expect(msg).toBe(providerErrorUserMessage(code));
      expect(msg).not.toContain(ADVERSARIAL_BODY);
      expect(msg.length).toBeGreaterThan(10);
    }
  });

  it("never echoes arbitrary Error.message that looks like a provider body", () => {
    const msg = toUserFacingReviewError(new Error(`OpenAI error 400: ${ADVERSARIAL_BODY}`));
    expect(msg).toBe(providerErrorUserMessage("provider_error"));
    assertNoLeakage(msg);
  });
});
