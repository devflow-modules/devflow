import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

function getHealth(query = "") {
  return GET(
    new Request(`http://localhost/career-llm/health${query}`) as never,
  );
}

describe("GET /career-llm/health", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns client-safe status for the default mock provider", async () => {
    const response = await getHealth();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      enabled: false,
      provider: "mock",
      configured: true,
      modelAlias: expect.any(String),
      reachable: null,
    });
  });

  it("reports openai as not configured without a key and model", async () => {
    vi.stubEnv("CAREER_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("CAREER_LLM_MODEL", "");

    const response = await getHealth();
    const json = await response.json();

    expect(json.provider).toBe("openai");
    expect(json.configured).toBe(false);
    expect(json.reachable).toBeNull();
  });

  it("never exposes secrets, raw model id, or internal URLs", async () => {
    vi.stubEnv("CAREER_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-super-secret");
    vi.stubEnv("CAREER_LLM_MODEL", "internal-model-id-xyz");

    const response = await getHealth();
    const serialized = JSON.stringify(await response.json());

    expect(serialized).not.toContain("sk-super-secret");
    expect(serialized).not.toContain("internal-model-id-xyz");
    expect(serialized).not.toMatch(/api\.openai\.com/);
    expect(serialized).not.toMatch(/OPENAI_API_KEY/);
  });

  it("returns 405 for POST", async () => {
    const response = await POST();
    expect(response.status).toBe(405);
  });
});
