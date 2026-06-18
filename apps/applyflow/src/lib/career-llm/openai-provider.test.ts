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

function responsesPayload(output: unknown) {
  return {
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(output) }],
      },
    ],
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

function httpResponse(body: unknown, ok = true, status = 200): Response {
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

describe("OpenAiCareerLlmProvider (Responses API)", () => {
  it("returns provider_not_configured without an api key or model", async () => {
    const noKey = createOpenAiCareerLlmProvider({ apiKey: "", model: "gpt-x", modelAlias: "career-openai-1" });
    const noModel = createOpenAiCareerLlmProvider({ apiKey: "sk-test", model: "", modelAlias: "career-openai-1" });

    const a = await noKey.generate(sampleRequest());
    const b = await noModel.generate(sampleRequest());

    expect(a.ok).toBe(false);
    expect(a.externalCall).toBe(false);
    expect(a.error?.code).toBe("provider_not_configured");
    expect(b.error?.code).toBe("provider_not_configured");
  });

  it("calls the Responses API with structured outputs, store:false and stream:false, no tools", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(httpResponse(responsesPayload(validOutput))));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(true);
    expect(response.externalCall).toBe(true);
    expect(response.usage).toEqual({ inputUnits: 10, outputUnits: 5 });
    expect(response.retryCount).toBe(0);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("gpt-x");
    expect(body.store).toBe(false);
    expect(body.stream).toBe(false);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
    expect(body.text.format.schema.additionalProperties).toBe(false);
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
    expect(body).not.toHaveProperty("functions");
    expect(body).not.toHaveProperty("response_format");
  });

  it("maps a refusal to provider_refused", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        httpResponse({
          status: "completed",
          output: [{ type: "message", content: [{ type: "refusal", refusal: "I cannot help with that." }] }],
        }),
      ),
    );
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("provider_refused");
  });

  it("maps an empty response to invalid_structured_output", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(httpResponse({ status: "completed", output: [] })));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("invalid_structured_output");
  });

  it("maps an incomplete (max tokens) response to output_limit_exceeded", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        httpResponse({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }),
      ),
    );
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("output_limit_exceeded");
  });

  it("maps invalid JSON content to invalid_structured_output", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        httpResponse({
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text: "not json" }] }],
        }),
      ),
    );
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("invalid_structured_output");
  });

  it("maps 401 to provider_auth_failed without retrying", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(httpResponse({}, false, 401)));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      maxRetries: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("provider_auth_failed");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once on 429 then succeeds and reports retryCount", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(httpResponse({}, false, 429))
      .mockResolvedValueOnce(httpResponse(responsesPayload(validOutput)));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      maxRetries: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(true);
    expect(response.retryCount).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("stops after one retry on persistent 503 and maps to rate/request failure", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(httpResponse({}, false, 503)));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      maxRetries: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("provider_request_failed");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry when maxRetries is 0", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(httpResponse({}, false, 500)));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      maxRetries: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps an aborted/timed-out request to provider_timeout", async () => {
    const fetchImpl = vi.fn(() => {
      const error = new Error("aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-test",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      maxRetries: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("provider_timeout");
  });

  it("never serializes the api key into the response", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(httpResponse(responsesPayload(validOutput))));
    const provider = createOpenAiCareerLlmProvider({
      apiKey: "sk-super-secret",
      model: "gpt-x",
      modelAlias: "career-openai-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const response = await provider.generate(sampleRequest());
    expect(JSON.stringify(response)).not.toContain("sk-super-secret");
  });
});
