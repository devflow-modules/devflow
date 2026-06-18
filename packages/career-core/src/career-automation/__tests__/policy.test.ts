import { describe, expect, it } from "vitest";
import { deriveCareerAgentRequestId } from "../../career-agents/request.js";
import type { CareerAgentExecutionPlan } from "../../career-agents/types.js";
import { resolveExecutionPlanFromOrchestration } from "../../career-tools/permission.js";
import { CAREER_AUTOMATION_KIND_MAP } from "../constants.js";
import { evaluateCareerAutomationPolicy } from "../policy.js";
import { resolveCareerAutomationProposal } from "../proposal.js";
import type {
  CareerAutomationApproval,
  CareerAutomationKind,
  CareerAutomationProvider,
} from "../types.js";
import { createSampleCareerBundle } from "./fixtures.js";

function buildPlan(kind: CareerAutomationKind): {
  executionPlan: CareerAgentExecutionPlan;
  agentRequestId: string;
  orchestration: unknown;
} {
  const mapping = CAREER_AUTOMATION_KIND_MAP[kind];
  const careerBundle = createSampleCareerBundle();
  const orchestration = {
    intent: mapping.intent,
    explicitConsent: true as const,
    context: { careerBundle, selectedSignalIds: [] as string[] },
  };
  const agentRequestId = deriveCareerAgentRequestId({
    intent: mapping.intent,
    careerBundle,
    selectedSignalIds: [],
  });
  const resolved = resolveExecutionPlanFromOrchestration(orchestration, agentRequestId);
  if (!resolved.ok) {
    throw new Error(`failed to build plan: ${resolved.message}`);
  }
  return { executionPlan: resolved.executionPlan, agentRequestId, orchestration };
}

function evaluate(
  kind: CareerAutomationKind,
  overrides: {
    automationEnabled?: boolean;
    provider?: CareerAutomationProvider;
    executionPlan?: CareerAgentExecutionPlan | null;
    approval?: Partial<CareerAutomationApproval>;
    withToolApproval?: boolean;
    contextPayload?: unknown;
  } = {},
) {
  const { executionPlan, agentRequestId, orchestration } = buildPlan(kind);
  const proposal = resolveCareerAutomationProposal({
    kind,
    agentRequestId,
    context: { careerBundle: createSampleCareerBundle(), selectedSignalIds: [] },
  });

  const approval: CareerAutomationApproval = {
    proposalId: proposal.proposalId,
    approved: true,
    approvedAt: "2026-06-17T10:00:00.000Z",
    approvalScope: "single_execution",
    ...overrides.approval,
  };

  const toolApproval =
    overrides.withToolApproval ?? proposal.requiresExplicitApproval
      ? {
          toolName: proposal.requestedTool,
          approved: true as const,
          approvedAt: "2026-06-17T10:00:00.000Z",
          approvalScope: "single_execution" as const,
        }
      : undefined;

  return evaluateCareerAutomationPolicy({
    proposal,
    approval,
    toolApproval,
    executionPlan: overrides.executionPlan === undefined ? executionPlan : overrides.executionPlan,
    toolInput: proposal.inputPreview,
    contextPayload: overrides.contextPayload ?? orchestration,
    provider: overrides.provider ?? "mock",
    automationEnabled: overrides.automationEnabled ?? true,
  });
}

describe("evaluateCareerAutomationPolicy", () => {
  it("allows a valid derive automation", () => {
    expect(evaluate("prepare_application_review").allowed).toBe(true);
    expect(evaluate("prepare_profile_gap_review").allowed).toBe(true);
    expect(evaluate("prepare_interview_plan").allowed).toBe(true);
  });

  it("allows the export automation with explicit approval", () => {
    expect(evaluate("prepare_review_export").allowed).toBe(true);
  });

  it("blocks when the flag is disabled", () => {
    const decision = evaluate("prepare_application_review", { automationEnabled: false });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("automation_disabled");
  });

  it("blocks an unsupported provider", () => {
    const decision = evaluate("prepare_application_review", {
      provider: "external" as unknown as CareerAutomationProvider,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("unsupported_automation_provider");
  });

  it("blocks when the execution plan is missing", () => {
    const decision = evaluate("prepare_application_review", { executionPlan: null });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("execution_plan_not_available");
  });

  it("blocks an approval that does not match the proposal", () => {
    const decision = evaluate("prepare_application_review", {
      approval: { proposalId: "wrong-proposal" },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("approval_proposal_mismatch");
  });

  it("blocks when explicit approval is missing for export", () => {
    const decision = evaluate("prepare_review_export", { withToolApproval: false });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("explicit_approval_required");
  });

  it("blocks an unsafe context", () => {
    const decision = evaluate("prepare_application_review", {
      contextPayload: { schedule: "*/5 * * * *" },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("unsafe_automation_context");
  });

  it("blocks an approval that does not match the resolved tool", () => {
    const { executionPlan, agentRequestId, orchestration } = buildPlan("prepare_review_export");
    const proposal = resolveCareerAutomationProposal({
      kind: "prepare_review_export",
      agentRequestId,
      context: { careerBundle: createSampleCareerBundle(), selectedSignalIds: [] },
    });

    const decision = evaluateCareerAutomationPolicy({
      proposal,
      approval: {
        proposalId: proposal.proposalId,
        approved: true,
        approvedAt: "2026-06-17T10:00:00.000Z",
        approvalScope: "single_execution",
      },
      toolApproval: {
        toolName: "career.derive_fit_summary",
        approved: true,
        approvedAt: "2026-06-17T10:00:00.000Z",
        approvalScope: "single_execution",
      },
      executionPlan,
      toolInput: proposal.inputPreview,
      contextPayload: orchestration,
      provider: "mock",
      automationEnabled: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("approval_tool_mismatch");
  });
});
