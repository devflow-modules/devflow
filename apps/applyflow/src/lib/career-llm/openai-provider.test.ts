import { describe, expect, it, vi } from "vitest";
import type { CareerLlmProviderRequest } from "@devflow/career-core";
import { createOpenAiCareerLlmProvider } from "./openai-provider";

function sampleRequest(): CareerLlmProviderRequest {
  return {
    task: "generate_application_fit_explanation",
    envelope: {
      task: "generate_application_fit_explanation",
      instructions: "Write a reviewable explanation.",
      contextSummary: "AGENT: application_analyst\nSUMMARY: Fit review.",
      outputSchema: "schema",
      constraints: ["Output JSON only.", "Never execute tools."],
    },
    modelAlias: "career-openai-1",
    temperature: 0,
    maxOutputTokens: 1024,
    timeoutMs: 5000,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const validOutput = {
  title: "Fit draft",
  summary: "Summary",
  findings: [],
  recommendations: [],
  evidenceReferences: [],
  warnings: [],
};

describe("OpenAiCareerLlmProvider", () => {
  it("returns provider_not_configured without an api key", async () => {
    const provider = createOpenAiCareerLlmProvider({ apiKey: "", model: "gpt-4o-mini", modelAlias: "career-openai-1" });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.externalCall).toBe(false);
    expect(response.error?.code).toBe("provider_not_configured");
  });

  it("performs a server-side request without streaming or tools", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        jsonResponse({
          choices: [{ message: { content: JSON.stringify(validOutput) } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      ),
    );
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(true);
    expect(response.externalCall).toBe(true);
    expect(response.usage).toEqual({ inputUnits: 10, outputUnits: 5 });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(String(init.body));
    expect(requestBody.stream).toBe(false);
    expect(requestBody).not.toHaveProperty("tools");
    expect(requestBody).not.toHaveProperty("functions");
    expect(requestBody.response_format).toEqual({ type: "json_object" });
  });

  it("maps a provider http error to provider_request_failed", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse({}, false, 500)));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("provider_request_failed");
  });

  it("maps invalid JSON to invalid_structured_output", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({ choices: [{ message: { content: "not json" } }] })),
    );
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("invalid_structured_output");
  });

  it("maps a network failure or timeout to provider_request_failed", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error("network")));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("provider_request_failed");
  });

  it("never serializes the api key into the response", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        jsonResponse({ choices: [{ message: { content: JSON.stringify(validOutput) } }] }),
      ),
    );
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-super-secret",
      model: "gpt-4o-mini",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(JSON.stringify(response)).not.toContain("sk-super-secret");
  });
});
