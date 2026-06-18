import { describe, expect, it, vi } from "vitest";
import {
  probeCareerLlmReachable,
  resolveCareerLlmHealthStatus,
  resolveCareerLlmMaxRetries,
  resolveCareerLlmProviderConfig,
  resolveCareerLlmTimeoutMs,
} from "./career-llm-boundary";

function okResponse(ok = true): Response {
  return { ok, status: ok ? 200 : 401 } as unknown as Response;
}

describe("career-llm provider config", () => {
  it("defaults to a configured mock provider", () => {
    const config = resolveCareerLlmProviderConfig({ CAREER_LLM_PROVIDER: "mock" });
    expect(config.provider).toBe("mock");
    expect(config.configured).toBe(true);
  });

  it("requires both api key and model to consider openai configured (no silent fallback)", () => {
    const noModel = resolveCareerLlmProviderConfig({ CAREER_LLM_PROVIDER: "openai", OPENAI_API_KEY: "sk" });
    const noKey = resolveCareerLlmProviderConfig({ CAREER_LLM_PROVIDER: "openai", CAREER_LLM_MODEL: "m" });
    const both = resolveCareerLlmProviderConfig({
      CAREER_LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "sk",
      CAREER_LLM_MODEL: "m",
    });

    expect(noModel.provider).toBe("openai");
    expect(noModel.configured).toBe(false);
    expect(noKey.configured).toBe(false);
    expect(both.configured).toBe(true);
  });

  it("does not hardcode the model into the alias", () => {
    const config = resolveCareerLlmProviderConfig({
      CAREER_LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "sk",
      CAREER_LLM_MODEL: "internal-secret-model",
    });
    expect(config.modelAlias).not.toContain("internal-secret-model");
  });
});

describe("career-llm bounded settings", () => {
  it("clamps timeout within bounds and falls back on invalid input", () => {
    expect(resolveCareerLlmTimeoutMs({})).toBe(15000);
    expect(resolveCareerLlmTimeoutMs({ CAREER_LLM_TIMEOUT_MS: "abc" })).toBe(15000);
    expect(resolveCareerLlmTimeoutMs({ CAREER_LLM_TIMEOUT_MS: "100" })).toBe(1000);
    expect(resolveCareerLlmTimeoutMs({ CAREER_LLM_TIMEOUT_MS: "999999" })).toBe(60000);
  });

  it("clamps retries to the ceiling and never goes negative", () => {
    expect(resolveCareerLlmMaxRetries({})).toBe(1);
    expect(resolveCareerLlmMaxRetries({ CAREER_LLM_MAX_RETRIES: "-5" })).toBe(0);
    expect(resolveCareerLlmMaxRetries({ CAREER_LLM_MAX_RETRIES: "50" })).toBe(3);
  });
});

describe("career-llm health status", () => {
  it("returns null reachable without an explicit probe", () => {
    const status = resolveCareerLlmHealthStatus({ CAREER_LLM_PROVIDER: "mock" });
    expect(status.reachable).toBeNull();
    expect(status.provider).toBe("mock");
  });

  it("probe is always reachable for mock without any network call", async () => {
    const fetchImpl = vi.fn();
    const reachable = await probeCareerLlmReachable({ CAREER_LLM_PROVIDER: "mock" }, fetchImpl as never);
    expect(reachable).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("probe returns false for unconfigured openai without calling the api", async () => {
    const fetchImpl = vi.fn();
    const reachable = await probeCareerLlmReachable({ CAREER_LLM_PROVIDER: "openai" }, fetchImpl as never);
    expect(reachable).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("probe performs a single lightweight model lookup for configured openai", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(okResponse(true)));
    const reachable = await probeCareerLlmReachable(
      { CAREER_LLM_PROVIDER: "openai", OPENAI_API_KEY: "sk", CAREER_LLM_MODEL: "m" },
      fetchImpl as never,
    );
    expect(reachable).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/models/");
    expect(init.method).toBe("GET");
  });
});
