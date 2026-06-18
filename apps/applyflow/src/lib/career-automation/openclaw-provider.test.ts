import { describe, expect, it, vi } from "vitest";
import type { CareerAutomationAdapterRequest } from "@devflow/career-core";
import { createOpenClawCareerAutomationAdapter } from "./openclaw-provider";

type Mapping = { kind: string; tool: string; capability: string };

const KIND_MAPPINGS: Mapping[] = [
  { kind: "prepare_application_review", tool: "career.derive_fit_summary", capability: "derive_fit_summary" },
  { kind: "prepare_profile_gap_review", tool: "career.derive_gap_analysis", capability: "derive_gap_analysis" },
  { kind: "prepare_interview_plan", tool: "career.derive_interview_plan", capability: "derive_interview_plan" },
  { kind: "prepare_review_export", tool: "career.export_review_payload", capability: "create_review_proposal" },
];

function sampleRequest(mapping: Mapping = KIND_MAPPINGS[0]): CareerAutomationAdapterRequest {
  return {
    proposal: {
      proposalId: `career-automation::${mapping.kind}::req-1`,
      kind: mapping.kind as never,
      title: "t",
      description: "d",
      requestedTool: mapping.tool as never,
      requiredCapability: mapping.capability as never,
      riskLevel: "derive" as never,
      requiresExplicitApproval: false,
      inputPreview: { applicationId: "app-1" },
      reviewRequired: true,
    },
    executionPlan: {
      proposalId: `career-automation::${mapping.kind}::req-1`,
      kind: mapping.kind as never,
      selectedTool: mapping.tool as never,
      requiredCapability: mapping.capability as never,
      allowed: true,
      blockedReasons: [],
      requiresExplicitApproval: false,
      reviewRequired: true,
    },
    toolInvocation: {
      agentRequestId: "req-1",
      toolName: mapping.tool as never,
      input: { applicationId: "app-1" },
      explicitApproval: true,
      approval: undefined,
      orchestration: { intent: "analyze_application_fit" as never, explicitConsent: true, context: {} as never },
    },
    timeoutMs: 10000,
    requestedAt: "2026-06-18T12:00:00.000Z",
  };
}

function okResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response;
}

function completedPayload(mapping: Mapping, overrides: Record<string, unknown> = {}) {
  return {
    status: "completed",
    proposalId: `career-automation::${mapping.kind}::req-1`,
    automationKind: mapping.kind,
    toolName: mapping.tool,
    result: { summary: "Reviewable summary", items: [] },
    warnings: [],
    durationMs: 12,
    ...overrides,
  };
}

const baseOptions = {
  enabled: true,
  apiKey: "ocw-secret-key",
  baseUrl: "https://openclaw.local",
  timeoutMs: 10000,
};

describe("OpenClawCareerAutomationAdapter", () => {
  it("returns openclaw_disabled when the provider flag is off, without a network call", async () => {
    const fetchImpl = vi.fn();
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, enabled: false, fetchImpl: fetchImpl as never });
    const response = await adapter.execute(sampleRequest());
    expect(response.ok).toBe(false);
    expect(response.externalCall).toBe(false);
    expect(response.error?.code).toBe("openclaw_disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns openclaw_not_configured without key or base url", async () => {
    const fetchImpl = vi.fn();
    const noKey = createOpenClawCareerAutomationAdapter({ ...baseOptions, apiKey: "", fetchImpl: fetchImpl as never });
    const noUrl = createOpenClawCareerAutomationAdapter({ ...baseOptions, baseUrl: "", fetchImpl: fetchImpl as never });
    expect((await noKey.execute(sampleRequest())).error?.code).toBe("openclaw_not_configured");
    expect((await noUrl.execute(sampleRequest())).error?.code).toBe("openclaw_not_configured");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends a single-execution envelope with Bearer auth and no extra control fields", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(okResponse(completedPayload(KIND_MAPPINGS[0]))));
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    const response = await adapter.execute(sampleRequest());

    expect(response.ok).toBe(true);
    expect(response.externalCall).toBe(true);
    expect(response.retryCount).toBe(0);
    expect(response.data).toEqual({ summary: "Reviewable summary", items: [] });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openclaw.local/v1/executions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ocw-secret-key");
    const body = JSON.parse(String(init.body));
    expect(body.executionMode).toBe("single_execution");
    expect(body.reviewRequired).toBe(true);
    expect(body.approvedTool).toBe("career.derive_fit_summary");
    expect(body).not.toHaveProperty("toolRegistry");
    expect(body).not.toHaveProperty("executionPlan");
    expect(body).not.toHaveProperty("callbackUrl");
    expect(body).not.toHaveProperty("webhookUrl");
    expect(body).not.toHaveProperty("schedule");
  });

  it("executes all four allowlisted kinds with one call each", async () => {
    for (const mapping of KIND_MAPPINGS) {
      const fetchImpl = vi.fn(() => Promise.resolve(okResponse(completedPayload(mapping))));
      const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
      const response = await adapter.execute(sampleRequest(mapping));
      expect(response.ok, mapping.kind).toBe(true);
      expect(response.externalCall).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it("maps a timeout/abort to openclaw_timeout", async () => {
    const fetchImpl = vi.fn(() => {
      const error = new Error("aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    expect((await adapter.execute(sampleRequest())).error?.code).toBe("openclaw_timeout");
  });

  it("maps a network failure to openclaw_unreachable", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error("ECONNREFUSED")));
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    expect((await adapter.execute(sampleRequest())).error?.code).toBe("openclaw_unreachable");
  });

  it("maps 401/403 to openclaw_auth_failed", async () => {
    for (const status of [401, 403]) {
      const fetchImpl = vi.fn(() => Promise.resolve(okResponse({}, false, status)));
      const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
      expect((await adapter.execute(sampleRequest())).error?.code).toBe("openclaw_auth_failed");
    }
  });

  it("maps 500 to openclaw_request_failed without retrying", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(okResponse({}, false, 500)));
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    const response = await adapter.execute(sampleRequest());
    expect(response.error?.code).toBe("openclaw_request_failed");
    expect(response.retryCount).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry on a transient 503 (single attempt)", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(okResponse({}, false, 503)));
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    await adapter.execute(sampleRequest());
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps invalid JSON to openclaw_response_invalid", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error("bad json")) } as unknown as Response),
    );
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    expect((await adapter.execute(sampleRequest())).error?.code).toBe("openclaw_response_invalid");
  });

  it("rejects a proposal mismatch", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(okResponse(completedPayload(KIND_MAPPINGS[0], { proposalId: "spoofed" }))),
    );
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    expect((await adapter.execute(sampleRequest())).error?.code).toBe("openclaw_proposal_mismatch");
  });

  it("rejects a tool mismatch", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(okResponse(completedPayload(KIND_MAPPINGS[0], { toolName: "career.export_review_payload" }))),
    );
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    expect((await adapter.execute(sampleRequest())).error?.code).toBe("openclaw_tool_mismatch");
  });

  it("rejects a response that requests a next action (second step)", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(okResponse(completedPayload(KIND_MAPPINGS[0], { nextAction: "run_more" }))),
    );
    const adapter = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: fetchImpl as never });
    expect((await adapter.execute(sampleRequest())).error?.code).toBe("openclaw_unsafe_response");
  });

  it("rejects a response carrying toolCalls or a command", async () => {
    const withToolCalls = vi.fn(() =>
      Promise.resolve(okResponse(completedPayload(KIND_MAPPINGS[0], { toolCalls: [{ name: "x" }] }))),
    );
    const withCommand = vi.fn(() =>
      Promise.resolve(okResponse(completedPayload(KIND_MAPPINGS[0], { result: { command: "rm -rf /" } }))),
    );
    const a = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: withToolCalls as never });
    const b = createOpenClawCareerAutomationAdapter({ ...baseOptions, fetchImpl: withCommand as never });
    expect((await a.execute(sampleRequest())).error?.code).toBe("openclaw_unsafe_response");
    expect((await b.execute(sampleRequest())).error?.code).toBe("openclaw_unsafe_response");
  });

  it("never serializes the api key into the response", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(okResponse(completedPayload(KIND_MAPPINGS[0]))));
    const adapter = createOpenClawCareerAutomationAdapter({
      ...baseOptions,
      apiKey: "ocw-super-secret",
      fetchImpl: fetchImpl as never,
    });
    const response = await adapter.execute(sampleRequest());
    expect(JSON.stringify(response)).not.toContain("ocw-super-secret");
  });
});
