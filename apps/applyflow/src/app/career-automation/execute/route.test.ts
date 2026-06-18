import { scanCareerAutomationPayloadForForbiddenKeys } from "@devflow/career-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

function createValidBody() {
  return {
    kind: "prepare_application_review" as const,
    explicitApproval: true as const,
    approvalScope: "single_execution" as const,
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

function postExecute(body: unknown) {
  return POST(
    new Request("http://localhost/career-automation/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("POST /career-automation/execute", () => {
  beforeEach(() => {
    vi.stubEnv("CAREER_AUTOMATION_ENABLED", "true");
    vi.stubEnv("CAREER_AUTOMATION_PROVIDER", "mock");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a client-safe completed result with mock provider", async () => {
    const response = await postExecute(createValidBody());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("completed");
    expect(json.provider).toBe("mock");
    expect(json.kind).toBe("prepare_application_review");
    expect(json.reviewRequired).toBe(true);
    expect(json.safeForClient).toBe(true);
    expect(json.hasToken).toBe(false);
    expect(json.persisted).toBe(false);
    expect(json.scheduled).toBe(false);
    expect(json.backgroundExecution).toBe(false);
    expect(json.executedExternally).toBe(false);
    expect(scanCareerAutomationPayloadForForbiddenKeys(json)).toEqual([]);
  });

  it("blocks when the feature flag is disabled", async () => {
    vi.stubEnv("CAREER_AUTOMATION_ENABLED", "false");
    const response = await postExecute(createValidBody());
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.warnings.some((w: { code: string }) => w.code === "automation_disabled")).toBe(true);
  });

  it("blocks an unsupported kind", async () => {
    const response = await postExecute({ ...createValidBody(), kind: "submit_application" });
    expect(response.status).toBe(403);
  });

  it("blocks without explicit approval", async () => {
    const response = await postExecute({ ...createValidBody(), explicitApproval: false });
    expect(response.status).toBe(403);
  });

  it("blocks an approval that does not match the proposal", async () => {
    const response = await postExecute({ ...createValidBody(), proposalId: "spoofed" });
    const json = await response.json();
    expect(response.status).toBe(403);
    expect(json.warnings.some((w: { code: string }) => w.code === "approval_proposal_mismatch")).toBe(true);
  });

  it("blocks an unsafe payload", async () => {
    const response = await postExecute({ ...createValidBody(), schedule: "*/5 * * * *" });
    expect(response.status).toBe(403);
  });

  it("blocks a client-provided tool override", async () => {
    const response = await postExecute({ ...createValidBody(), toolName: "career.export_review_payload" });
    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/career-automation/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }) as never,
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /career-automation/execute", () => {
  it("returns 405", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
