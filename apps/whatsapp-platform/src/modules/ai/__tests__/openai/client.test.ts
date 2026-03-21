import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../openai/config", () => ({
  OPENAI_CONFIG: {
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    maxTokens: 220,
    temperature: 0.4,
    timeoutMs: 5000,
  },
  isOpenAiConfigured: () => true,
}));

const mockFetch = vi.fn();

describe("callChatCompletion", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    mockFetch.mockReset();
  });

  it("retorna texto em sucesso", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Olá! Como posso ajudar?" } }],
          usage: { total_tokens: 42 },
        }),
    });

    const { callChatCompletion } = await import("../../openai/client");
    const result = await callChatCompletion([
      { role: "system", content: "Você é um assistente." },
      { role: "user", content: "Oi" },
    ]);

    expect(result.error).toBeUndefined();
    expect(result.text).toBe("Olá! Como posso ajudar?");
    expect(result.tokensUsed).toBe(42);
  });

  it("retorna error em 429", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('{"error":{"message":"Quota exceeded"}}'),
    });

    const { callChatCompletion } = await import("../../openai/client");
    const result = await callChatCompletion([{ role: "user", content: "test" }]);

    expect(result.error).toContain("429");
    expect(result.text).toBe("");
    expect(result.statusCode).toBe(429);
  });

  it("retorna error em 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    const { callChatCompletion } = await import("../../openai/client");
    const result = await callChatCompletion([{ role: "user", content: "x" }]);

    expect(result.error).toContain("401");
    expect(result.statusCode).toBe(401);
  });

  it("retorna error em resposta vazia", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: "" } }] }),
    });

    const { callChatCompletion } = await import("../../openai/client");
    const result = await callChatCompletion([{ role: "user", content: "x" }]);

    expect(result.text).toBe("");
    expect(result.error).toBeUndefined();
  });
});
