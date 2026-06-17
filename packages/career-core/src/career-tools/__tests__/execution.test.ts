import { describe, expect, it } from "vitest";
import { buildCareerAgentContext } from "../../career-agents/context.js";
import { buildCareerAgentRequest } from "../../career-agents/request.js";
import { createSampleOrchestrationBody } from "../../career-agents/__tests__/fixtures.js";
import { executeCareerToolPure } from "../executor.js";
import { invokeCareerTool } from "../invoke.js";
import type { CareerToolExecutionResult, CareerToolName } from "../types.js";

const requestedAt = "2026-06-16T12:00:00.000Z";

function stripTraceTimestamps(result: CareerToolExecutionResult) {
  return {
    ...result,
    trace: {
      ...result.trace,
      steps: result.trace.steps.map(({ timestamp: _timestamp, ...step }) => step),
    },
  };
}

function assertClientSafeResult(result: CareerToolExecutionResult) {
  expect(result.reviewRequired).toBe(true);
  expect(result.safeForClient).toBe(true);
  expect(result.hasToken).toBe(false);
  expect(result.persisted).toBe(false);
  expect(result.executedExternally).toBe(false);
}

function invokeWithOrchestration(
  toolName: CareerToolName,
  input: Record<string, unknown>,
  orchestrationOverrides: Parameters<typeof createSampleOrchestrationBody>[0] = {},
  approval?: {
    toolName: CareerToolName;
    approved: true;
    approvedAt: string;
    approvalScope: "single_execution" | "single_request";
  },
) {
  const orchestration = createSampleOrchestrationBody(orchestrationOverrides);
  const request = buildCareerAgentRequest(orchestration);

  return invokeCareerTool(
    {
      agentRequestId: request.requestId,
      toolName,
      input,
      explicitApproval: true,
      orchestration,
      approval,
    },
    requestedAt,
  );
}

describe("career tool execution engine", () => {
  const orchestration = createSampleOrchestrationBody();
  const request = buildCareerAgentRequest(orchestration);
  const context = buildCareerAgentContext(request);

  it("executes read_bundle from in-memory context", () => {
    const result = invokeWithOrchestration("career.read_bundle", {});
    expect(result.status).toBe("completed");
    assertClientSafeResult(result);
    expect(result.data.applicationCount).toBe(2);
  });

  it("executes read_selected_signals from context", () => {
    const result = invokeWithOrchestration("career.read_selected_signals", {
      selectedSignalIds: ["signal-1"],
    });
    expect(result.status).toBe("completed");
    assertClientSafeResult(result);
    expect(result.data.count).toBe(1);
  });

  it("executes derive_fit_summary", () => {
    const result = invokeWithOrchestration(
      "career.derive_fit_summary",
      { applicationId: "app-1" },
      { intent: "analyze_application_fit" },
    );
    expect(result.status).toBe("completed");
    assertClientSafeResult(result);
    expect(result.data.applicationId).toBe("app-1");
  });

  it("executes derive_gap_analysis", () => {
    const result = invokeWithOrchestration(
      "career.derive_gap_analysis",
      { targetRole: "Backend Engineer", requiredSkills: ["Go"] },
      { intent: "analyze_profile_gaps" },
    );
    expect(result.status).toBe("completed");
    assertClientSafeResult(result);
    expect(result.data.targetRole).toBe("Backend Engineer");
  });

  it("executes derive_interview_plan", () => {
    const result = invokeWithOrchestration(
      "career.derive_interview_plan",
      { applicationId: "app-1", focusAreas: ["system design"] },
      { intent: "prepare_interview" },
    );
    expect(result.status).toBe("completed");
    assertClientSafeResult(result);
    expect(result.data.applicationId).toBe("app-1");
  });

  it("executes create_review_proposal", () => {
    const result = invokeWithOrchestration("career.create_review_proposal", {
      sourceResultId: "result-1",
      proposalType: "fit_summary",
    });
    expect(result.status).toBe("completed");
    assertClientSafeResult(result);
    expect(result.data.inMemory).toBe(true);
  });

  it("executes export_review_payload preview with approval", () => {
    const result = invokeWithOrchestration(
      "career.export_review_payload",
      { payloadType: "review_proposal", format: "markdown" },
      { intent: "analyze_application_fit" },
      {
        toolName: "career.export_review_payload",
        approved: true,
        approvedAt: requestedAt,
        approvalScope: "single_execution",
      },
    );
    expect(result.status).toBe("completed");
    assertClientSafeResult(result);
    expect(result.data.format).toBe("markdown");
    expect(typeof result.data.preview).toBe("string");
  });

  it("remains deterministic for pure executor output", () => {
    const first = executeCareerToolPure({
      toolName: "career.derive_gap_analysis",
      parsedInput: { targetRole: "Backend Engineer", requiredSkills: ["Go"] },
      context,
      agentRequestId: request.requestId,
      requestedAt,
    });
    const second = executeCareerToolPure({
      toolName: "career.derive_gap_analysis",
      parsedInput: { targetRole: "Backend Engineer", requiredSkills: ["Go"] },
      context,
      agentRequestId: request.requestId,
      requestedAt,
    });

    expect(first).toEqual(second);
  });

  it("remains deterministic for invoke output ignoring trace timestamps", () => {
    const input = {
      toolName: "career.derive_fit_summary" as const,
      payload: { applicationId: "app-1" },
      orchestration: { intent: "analyze_application_fit" as const },
    };

    const first = stripTraceTimestamps(
      invokeWithOrchestration(input.toolName, input.payload, input.orchestration),
    );
    const second = stripTraceTimestamps(
      invokeWithOrchestration(input.toolName, input.payload, input.orchestration),
    );

    expect(first.status).toBe(second.status);
    expect(first.data).toEqual(second.data);
    expect(first.warnings).toEqual(second.warnings);
    expect(first.trace.steps).toEqual(second.trace.steps);
  });
});
