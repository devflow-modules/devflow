import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCareerAgentRequest } from "../../career-agents/request.js";
import { createSampleOrchestrationBody } from "../../career-agents/__tests__/fixtures.js";
import * as registry from "../registry.js";
import {
  evaluateCareerToolPermission,
  resolveExecutionPlanFromOrchestration,
  validateCareerToolApproval,
} from "../permission.js";
import { invokeCareerTool, parseCareerToolInvokeBody } from "../invoke.js";
import { createExecutionPlanFromOrchestration, createRestrictedExecutionPlan } from "./helpers.js";

const requestedAt = "2026-06-16T12:00:00.000Z";

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("blocks unsafe_tool_context", () => {
    const { orchestration, executionPlan } = createExecutionPlanFromOrchestration();

    const permission = evaluateCareerToolPermission({
      toolName: "career.derive_fit_summary",
      inputPayload: { applicationId: "app-1" },
      executionPlan,
      contextPayload: {
        ...orchestration,
        context: {
          ...orchestration.context,
          access_token: "secret",
        },
      },
    });

    expect(permission.allowed).toBe(false);
    expect(permission.code).toBe("unsafe_tool_context");
  });

  it("blocks agent_tool_mismatch", () => {
    const { orchestration, executionPlan } = createExecutionPlanFromOrchestration();

    const permission = evaluateCareerToolPermission({
      toolName: "career.derive_gap_analysis",
      inputPayload: { targetRole: "Backend Engineer", requiredSkills: ["Go"] },
      executionPlan: {
        ...executionPlan,
        selectedAgent: "application_analyst",
        allowedCapabilities: ["derive_gap_analysis", "read_career_bundle"],
      },
      contextPayload: orchestration,
    });

    expect(permission.allowed).toBe(false);
    expect(permission.code).toBe("agent_tool_mismatch");
  });

  it("blocks capability_not_allowed when agent lacks capability", () => {
    const { orchestration } = createExecutionPlanFromOrchestration();

    const permission = evaluateCareerToolPermission({
      toolName: "career.derive_interview_plan",
      inputPayload: { applicationId: "app-1" },
      executionPlan: createRestrictedExecutionPlan(["read_career_bundle"], "application_analyst"),
      contextPayload: orchestration,
    });

    expect(permission.allowed).toBe(false);
    expect(permission.code).toBe("capability_not_allowed");
  });

  it("blocks tool_not_allowed when agent has capability but plan excludes it", () => {
    const { orchestration } = createExecutionPlanFromOrchestration();

    const permission = evaluateCareerToolPermission({
      toolName: "career.derive_fit_summary",
      inputPayload: { applicationId: "app-1" },
      executionPlan: createRestrictedExecutionPlan(["read_career_bundle"], "application_analyst"),
      contextPayload: orchestration,
    });

    expect(permission.allowed).toBe(false);
    expect(permission.code).toBe("tool_not_allowed");
  });

  it("blocks blocked_tool when registry marks tool as blocked", () => {
    vi.spyOn(registry, "resolveCareerToolDefinition").mockReturnValue({
      name: "career.read_bundle",
      description: "blocked",
      requiredCapability: "read_career_bundle",
      riskLevel: "blocked",
      requiresExplicitApproval: false,
      executionMode: "blocked",
    });

    const { orchestration, executionPlan } = createExecutionPlanFromOrchestration();
    const permission = evaluateCareerToolPermission({
      toolName: "career.read_bundle",
      inputPayload: {},
      executionPlan,
      contextPayload: orchestration,
    });

    expect(permission.code).toBe("blocked_tool");
  });

  it("blocks execution_not_supported for unsupported execution mode", () => {
    vi.spyOn(registry, "resolveCareerToolDefinition").mockReturnValue({
      name: "career.read_bundle",
      description: "unsupported mode",
      requiredCapability: "read_career_bundle",
      riskLevel: "read",
      requiresExplicitApproval: false,
      executionMode: "unsupported-mode" as "local_pure",
    });
    vi.spyOn(registry, "isCareerToolName").mockReturnValue(true);

    const { orchestration, executionPlan } = createExecutionPlanFromOrchestration();
    const permission = evaluateCareerToolPermission({
      toolName: "career.read_bundle",
      inputPayload: {},
      executionPlan,
      contextPayload: orchestration,
    });

    expect(permission.code).toBe("execution_not_supported");
  });

  it("blocks unknown tool", () => {
    const { orchestration, executionPlan } = createExecutionPlanFromOrchestration();

    const permission = evaluateCareerToolPermission({
      toolName: "career.submit_application",
      inputPayload: {},
      executionPlan,
      contextPayload: orchestration,
    });

    expect(permission.code).toBe("unsupported_tool");
  });

  describe("approval model", () => {
    it("accepts valid approval for the correct tool", () => {
      const permission = validateCareerToolApproval({
        approval: {
          toolName: "career.export_review_payload",
          approved: true,
          approvedAt: requestedAt,
          approvalScope: "single_execution",
        },
        toolName: "career.export_review_payload",
        requiresExplicitApproval: true,
      });

      expect(permission.allowed).toBe(true);
    });

    it("blocks approval for another tool", () => {
      const permission = validateCareerToolApproval({
        approval: {
          toolName: "career.read_bundle",
          approved: true,
          approvedAt: requestedAt,
          approvalScope: "single_execution",
        },
        toolName: "career.export_review_payload",
        requiresExplicitApproval: true,
      });

      expect(permission.code).toBe("explicit_approval_required");
    });

    it("blocks missing export approval", () => {
      const permission = validateCareerToolApproval({
        approval: undefined,
        toolName: "career.export_review_payload",
        requiresExplicitApproval: true,
      });
      expect(permission.code).toBe("explicit_approval_required");
    });

    it("blocks invalid approval timestamp at parse boundary", () => {
      const orchestration = createSampleOrchestrationBody();
      const request = buildCareerAgentRequest(orchestration);

      const parsed = parseCareerToolInvokeBody({
        agentRequestId: request.requestId,
        toolName: "career.export_review_payload",
        input: { payloadType: "review_proposal", format: "json" },
        explicitApproval: true,
        orchestration,
        approval: {
          toolName: "career.export_review_payload",
          approved: true,
          approvedAt: "",
          approvalScope: "single_execution",
        },
      });

      expect(parsed.ok).toBe(false);
    });

    it("does not reuse approval between requests", () => {
      const orchestration = createSampleOrchestrationBody();
      const request = buildCareerAgentRequest(orchestration);
      const approval = {
        toolName: "career.export_review_payload" as const,
        approved: true as const,
        approvedAt: requestedAt,
        approvalScope: "single_execution" as const,
      };

      const first = invokeCareerTool(
        {
          agentRequestId: request.requestId,
          toolName: "career.export_review_payload",
          input: { payloadType: "review_proposal", format: "json" },
          explicitApproval: true,
          orchestration,
          approval,
        },
        requestedAt,
      );
      expect(first.status).toBe("completed");

      const second = invokeCareerTool(
        {
          agentRequestId: request.requestId,
          toolName: "career.export_review_payload",
          input: { payloadType: "review_proposal", format: "json" },
          explicitApproval: true,
          orchestration,
        },
        requestedAt,
      );

      expect(second.status).toBe("blocked");
      expect(second.warnings.some((warning) => warning.code === "explicit_approval_required")).toBe(true);
    });
  });
});
