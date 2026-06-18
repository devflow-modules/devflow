import { scanCareerLlmPayloadForForbiddenKeys } from "@devflow/career-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

function createValidBody() {
  return {
    explicitConsent: true as const,
    chatRequest: {
      action: "analyze_application_fit" as const,
      message: "Focus on backend reliability and data integrity",
    },
    context: {
      careerBundle: {
        schemaVersion: "1.0" as const,
        exportedAt: "2026-06-16T12:00:00.000Z",
        sourceProduct: "applyflow" as const,
        candidate: { targetRole: "Backend Engineer", mainStack: ["TypeScript"] },
        applications: [
          {
            id: "app-1",
            company: "Acme",
            role: "Backend Engineer",
            source: "linkedin" as const,
            requiredSkills: ["TypeScript", "PostgreSQL"],
            status: "applied" as const,
          },
        ],
      },
      selectedSignalIds: [],
    },
  };
}

function postGenerate(body: unknown) {
  return POST(
    new Request("http://localhost/career-llm/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("POST /career-llm/generate", () => {
  beforeEach(() => {
    vi.stubEnv("CAREER_LLM_ENABLED", "true");
    vi.stubEnv("CAREER_LLM_PROVIDER", "mock");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a client-safe completed result with mock provider", async () => {
    const response = await postGenerate(createValidBody());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("completed");
    expect(json.provider).toBe("mock");
    expect(json.reviewRequired).toBe(true);
    expect(json.safeForClient).toBe(true);
    expect(json.hasToken).toBe(false);
    expect(json.persisted).toBe(false);
    expect(json.toolExecutionOccurred).toBe(false);
    expect(json.executedExternally).toBe(false);
    expect(json.externalProviderCalled).toBe(false);
    expect(json.output).not.toBeNull();
    expect(scanCareerLlmPayloadForForbiddenKeys(json)).toEqual([]);
  });

  it("blocks when feature flag is disabled", async () => {
    vi.stubEnv("CAREER_LLM_ENABLED", "false");
    const response = await postGenerate(createValidBody());
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.warnings.some((w: { code: string }) => w.code === "llm_disabled")).toBe(true);
  });

  it("blocks without explicit consent", async () => {
    const response = await postGenerate({ ...createValidBody(), explicitConsent: false });
    expect(response.status).toBe(403);
  });

  it("blocks an invalid intent", async () => {
    const body = createValidBody();
    const response = await postGenerate({
      ...body,
      chatRequest: { action: "submit_application", message: "go" },
    });
    expect(response.status).toBe(403);
  });

  it("blocks an unsafe payload", async () => {
    const response = await postGenerate({ ...createValidBody(), access_token: "secret" });
    expect(response.status).toBe(403);
  });

  it("blocks a client-provided provider override", async () => {
    const response = await postGenerate({ ...createValidBody(), provider: "openai" });
    expect(response.status).toBe(403);
  });

  it("blocks when openai provider is not configured", async () => {
    vi.stubEnv("CAREER_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await postGenerate(createValidBody());
    const json = await response.json();
    expect(response.status).toBe(403);
    expect(json.warnings.some((w: { code: string }) => w.code === "provider_not_configured")).toBe(true);
  });

  it("returns 400 for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/career-llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }) as never,
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /career-llm/generate", () => {
  it("returns 405", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
