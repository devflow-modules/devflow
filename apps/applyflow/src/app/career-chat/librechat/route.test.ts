import { scanCareerChatPayloadForForbiddenKeys } from "@devflow/career-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

function createValidBody() {
  return {
    action: "prepare_interview" as const,
    message: "Focus on frontend architecture",
    explicitConsent: true as const,
    context: {
      careerBundle: {
        schemaVersion: "1.0" as const,
        exportedAt: "2026-06-16T12:00:00.000Z",
        sourceProduct: "applyflow" as const,
        applications: [
          {
            id: "app-1",
            company: "Acme",
            role: "Backend Engineer",
            source: "linkedin" as const,
            requiredSkills: ["TypeScript"],
            status: "applied" as const,
          },
        ],
      },
      selectedSignalIds: [],
    },
  };
}

function postLibrechat(body: unknown) {
  return POST(
    new Request("http://localhost/career-chat/librechat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("POST /career-chat/librechat", () => {
  beforeEach(() => {
    vi.stubEnv("LIBRECHAT_ADAPTER_ENABLED", "true");
    vi.stubEnv("LIBRECHAT_TRANSPORT_ENABLED", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns client-safe completed result", async () => {
    const response = await postLibrechat(createValidBody());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("completed");
    expect(json.reviewRequired).toBe(true);
    expect(json.safeForClient).toBe(true);
    expect(json.hasToken).toBe(false);
    expect(json.persisted).toBe(false);
    expect(json.executedExternally).toBe(false);
    expect(json.toolProposals.length).toBeGreaterThan(0);
    expect(scanCareerChatPayloadForForbiddenKeys(json)).toEqual([]);
  });

  it("blocks when feature flag is disabled", async () => {
    vi.stubEnv("LIBRECHAT_ADAPTER_ENABLED", "false");
    const response = await postLibrechat(createValidBody());
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.warnings.some((warning: { code: string }) => warning.code === "librechat_adapter_disabled")).toBe(
      true,
    );
  });

  it("blocks without explicit consent", async () => {
    const response = await postLibrechat({
      ...createValidBody(),
      explicitConsent: false,
    });

    expect(response.status).toBe(403);
  });

  it("blocks invalid intent action", async () => {
    const response = await postLibrechat({
      ...createValidBody(),
      action: "submit_application",
    });

    expect(response.status).toBe(403);
  });

  it("blocks unsafe payload", async () => {
    const response = await postLibrechat({
      ...createValidBody(),
      access_token: "secret",
    });

    expect(response.status).toBe(403);
  });

  it("blocks empty message", async () => {
    const response = await postLibrechat({
      ...createValidBody(),
      message: "   ",
    });

    expect(response.status).toBe(403);
  });

  it("blocks long message", async () => {
    const response = await postLibrechat({
      ...createValidBody(),
      message: "x".repeat(4001),
    });

    expect(response.status).toBe(403);
  });

  it("blocks client Authorization when transport is disabled", async () => {
    const response = await POST(
      new Request("http://localhost/career-chat/librechat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret",
        },
        body: JSON.stringify(createValidBody()),
      }) as never,
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/career-chat/librechat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }) as never,
    );

    expect(response.status).toBe(400);
  });
});

describe("GET /career-chat/librechat", () => {
  it("returns 405", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
