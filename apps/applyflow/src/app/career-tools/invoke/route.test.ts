import { deriveCareerAgentRequestId } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";
import { scanCareerAgentPayloadForForbiddenKeys } from "@devflow/career-core";

function createValidOrchestration() {
  const orchestration = {
    intent: "analyze_application_fit" as const,
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
      selectedSignalIds: ["signal-1"],
      availableSignals: [
        {
          id: "signal-1",
          source: "gmail" as const,
          kind: "provider_email_activity" as const,
          occurredAt: "2026-06-15T10:00:00.000Z",
          confidence: 0.8,
          reviewRequired: true as const,
          sourceCount: 1,
        },
      ],
    },
  };

  const agentRequestId = deriveCareerAgentRequestId({
    intent: orchestration.intent,
    careerBundle: orchestration.context.careerBundle,
    selectedSignalIds: orchestration.context.selectedSignalIds,
  });

  return { orchestration, agentRequestId };
}

function postInvoke(body: unknown) {
  return POST(
    new Request("http://localhost/career-tools/invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("POST /career-tools/invoke", () => {
  it("returns 200 for allowed tool", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.derive_fit_summary",
      input: { applicationId: "app-1" },
      explicitApproval: true,
      orchestration,
    });

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.status).toBe("completed");
    expect(json.reviewRequired).toBe(true);
    expect(json.safeForClient).toBe(true);
    expect(json.hasToken).toBe(false);
    expect(json.persisted).toBe(false);
    expect(json.executedExternally).toBe(false);
    expect(scanCareerAgentPayloadForForbiddenKeys(json)).toEqual([]);
  });

  it("returns 200 for export tool with approval", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.export_review_payload",
      input: { payloadType: "review_proposal", format: "json" },
      explicitApproval: true,
      orchestration,
      approval: {
        toolName: "career.export_review_payload",
        approved: true,
        approvedAt: "2026-06-16T12:00:00.000Z",
        approvalScope: "single_execution",
      },
    });

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.status).toBe("completed");
  });

  it("blocks unknown tool", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.submit_application",
      input: {},
      explicitApproval: true,
      orchestration,
    });

    const json = await response.json();
    expect(response.status).toBe(403);
    expect(json.warnings.some((warning: { code: string }) => warning.code === "unsupported_tool")).toBe(true);
  });

  it("blocks invalid input", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.derive_fit_summary",
      input: { applicationId: 123 },
      explicitApproval: true,
      orchestration,
    });

    expect(response.status).toBe(403);
  });

  it("blocks when execution plan is unavailable", async () => {
    const { orchestration } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId: "missing-plan-id",
      toolName: "career.derive_fit_summary",
      input: { applicationId: "app-1" },
      explicitApproval: true,
      orchestration,
    });

    const json = await response.json();
    expect(response.status).toBe(403);
    expect(json.warnings.some((warning: { code: string }) => warning.code === "execution_plan_not_available")).toBe(
      true,
    );
  });

  it("blocks capability for mismatched intent tool", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.derive_gap_analysis",
      input: { targetRole: "Backend Engineer", requiredSkills: ["Go"] },
      explicitApproval: true,
      orchestration,
    });

    const json = await response.json();
    expect(response.status).toBe(403);
    expect(
      json.warnings.some((warning: { code: string }) =>
        ["agent_tool_mismatch", "capability_not_allowed", "tool_not_allowed"].includes(warning.code),
      ),
    ).toBe(true);
  });

  it("blocks missing export approval", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.export_review_payload",
      input: { payloadType: "review_proposal", format: "json" },
      explicitApproval: true,
      orchestration,
    });

    expect(response.status).toBe(403);
  });

  it("blocks approval for another tool", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.export_review_payload",
      input: { payloadType: "review_proposal", format: "json" },
      explicitApproval: true,
      orchestration,
      approval: {
        toolName: "career.read_bundle",
        approved: true,
        approvedAt: "2026-06-16T12:00:00.000Z",
        approvalScope: "single_execution",
      },
    });

    expect(response.status).toBe(403);
  });

  it("blocks unsafe context", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.derive_fit_summary",
      input: { applicationId: "app-1", access_token: "secret" },
      explicitApproval: true,
      orchestration,
    });

    expect(response.status).toBe(403);
  });

  it("rejects client policy overrides", async () => {
    const { orchestration, agentRequestId } = createValidOrchestration();
    const response = await postInvoke({
      agentRequestId,
      toolName: "career.derive_fit_summary",
      input: { applicationId: "app-1" },
      explicitApproval: true,
      orchestration,
      requiredCapability: "submit_application",
      riskLevel: "read",
      executionMode: "local_pure",
      allowedCapabilities: ["submit_application"],
      blockedCapabilities: [],
      endpoint: "https://evil.example",
      headers: { Authorization: "Bearer secret" },
      token: "secret",
      secret: "secret",
      command: "rm -rf /",
    });

    expect(response.status).toBe(403);
  });

  it("returns 403 for invalid body", async () => {
    const response = await postInvoke({ toolName: "career.read_bundle" });
    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/career-tools/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }) as never,
    );

    expect(response.status).toBe(400);
  });
});

describe("GET /career-tools/invoke", () => {
  it("returns 405", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
