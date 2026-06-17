import { describe, expect, it } from "vitest";
import { buildCareerAgentRequest } from "../../career-agents/request.js";
import { createSampleOrchestrationBody } from "../../career-agents/__tests__/fixtures.js";
import {
  evaluateCareerToolPermission,
  resolveExecutionPlanFromOrchestration,
  validateCareerToolApproval,
} from "../permission.js";

describe("career tool permission engine", () => {
  it("allows permitted tool with reconstructed plan", () => {
    const orchestration = createSampleOrchestrationBody();
    const request = buildCareerAgentRequest(orchestration);
    const plan = resolveExecutionPlanFromOrchestration(orchestration, request.requestId);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    const permission = evaluateCareerToolPermission({
      toolName: "career.derive_fit_summary",
      inputPayload: { applicationId: "app-1" },
      executionPlan: plan.executionPlan,
      contextPayload: orchestration,
    });

    expect(permission.allowed).toBe(true);
  });

  it("blocks missing export approval", () => {
    const permission = validateCareerToolApproval({
      approval: undefined,
      toolName: "career.export_review_payload",
      requiresExplicitApproval: true,
    });
    expect(permission.code).toBe("explicit_approval_required");
  });

  it("blocks approval for another tool", () => {
    const permission = validateCareerToolApproval({
      approval: {
        toolName: "career.read_bundle",
        approved: true,
        approvedAt: "2026-06-16T12:00:00.000Z",
        approvalScope: "single_execution",
      },
      toolName: "career.export_review_payload",
      requiresExplicitApproval: true,
    });
    expect(permission.allowed).toBe(false);
  });

  it("blocks unknown tool", () => {
    const orchestration = createSampleOrchestrationBody();
    const request = buildCareerAgentRequest(orchestration);
    const plan = resolveExecutionPlanFromOrchestration(orchestration, request.requestId);
    if (!plan.ok) throw new Error("plan expected");

    const permission = evaluateCareerToolPermission({
      toolName: "career.submit_application",
      inputPayload: {},
      executionPlan: plan.executionPlan,
      contextPayload: orchestration,
    });

    expect(permission.code).toBe("unsupported_tool");
  });
});
