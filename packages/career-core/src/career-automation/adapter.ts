import { deriveCareerAgentRequestId } from "../career-agents/request.js";
import type { CareerAgentOrchestrationBody } from "../career-agents/schemas.js";
import { resolveExecutionPlanFromOrchestration } from "../career-tools/permission.js";
import type { CareerToolApproval, CareerToolInvokeBodyParsed } from "../career-tools/index.js";
import { CAREER_AUTOMATION_KIND_MAP } from "./constants.js";
import { buildCareerAutomationExecutionPlan, evaluateCareerAutomationPolicy } from "./policy.js";
import { resolveCareerAutomationProposal } from "./proposal.js";
import type { CareerAutomationExecuteBody } from "./schemas.js";
import {
  appendCareerAutomationTraceStep,
  createCareerAutomationTrace,
  createCareerAutomationTraceStep,
} from "./trace.js";
import type {
  CareerAutomationAdapter,
  CareerAutomationApproval,
  CareerAutomationExecutionResult,
  CareerAutomationKind,
  CareerAutomationPolicyBlockCode,
  CareerAutomationProviderConfig,
  CareerAutomationTrace,
  CareerAutomationWarning,
} from "./types.js";

function blockedResult(input: {
  provider: CareerAutomationProviderConfig["provider"];
  proposalId: string;
  kind: CareerAutomationKind | "unsupported_automation_kind";
  toolName: CareerAutomationExecutionResult["toolName"];
  code: CareerAutomationWarning["code"];
  message: string;
  trace: CareerAutomationTrace;
}): CareerAutomationExecutionResult {
  return {
    status: "blocked",
    provider: input.provider,
    proposalId: input.proposalId,
    kind: input.kind,
    toolName: input.toolName,
    data: {},
    warnings: [{ code: input.code, message: input.message }],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    backgroundExecution: false,
    scheduled: false,
    trace: input.trace,
  };
}

export async function executeCareerAutomation(input: {
  body: CareerAutomationExecuteBody;
  requestedAt: string;
  automationEnabled: boolean;
  providerConfig: CareerAutomationProviderConfig;
  adapter: CareerAutomationAdapter;
}): Promise<CareerAutomationExecutionResult> {
  const { body, requestedAt, automationEnabled, providerConfig, adapter } = input;
  const provider = providerConfig.provider;
  const mapping = CAREER_AUTOMATION_KIND_MAP[body.kind];

  const orchestration: CareerAgentOrchestrationBody = {
    intent: mapping.intent,
    explicitConsent: true,
    context: {
      careerBundle: body.context.careerBundle,
      selectedSignalIds: body.context.selectedSignalIds,
      availableSignals: body.context.availableSignals,
    },
  };

  const agentRequestId = deriveCareerAgentRequestId({
    intent: mapping.intent,
    careerBundle: body.context.careerBundle,
    selectedSignalIds: body.context.selectedSignalIds,
  });

  const proposal = resolveCareerAutomationProposal({
    kind: body.kind,
    agentRequestId,
    context: body.context,
  });

  let trace = createCareerAutomationTrace(agentRequestId, proposal.proposalId);
  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "automation_request_received",
      message: "Approved automation execution request received.",
    }),
  );

  if (!automationEnabled) {
    return blockedResult({
      provider,
      proposalId: proposal.proposalId,
      kind: body.kind,
      toolName: proposal.requestedTool,
      code: "automation_disabled",
      message: "Approved automation boundary is disabled by feature flag.",
      trace: appendCareerAutomationTraceStep(
        trace,
        createCareerAutomationTraceStep({
          timestamp: requestedAt,
          status: "blocked",
          code: "automation_policy_evaluated",
          message: "Automation boundary disabled.",
        }),
      ),
    });
  }

  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "proposal_resolved",
      message: `Resolved proposal for ${body.kind} -> ${proposal.requestedTool}.`,
    }),
  );

  const planResolution = resolveExecutionPlanFromOrchestration(orchestration, agentRequestId);
  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: planResolution.ok ? "completed" : "blocked",
      code: "execution_plan_resolved",
      message: planResolution.ok
        ? "Agent execution plan reconstructed deterministically."
        : planResolution.message,
    }),
  );

  const executionPlan = planResolution.ok ? planResolution.executionPlan : null;

  const approvalScope = body.approvalScope ?? "single_execution";
  const approval: CareerAutomationApproval = {
    proposalId: body.proposalId ?? proposal.proposalId,
    approved: true,
    approvedAt: requestedAt,
    approvalScope,
  };

  const toolApproval: CareerToolApproval | undefined = proposal.requiresExplicitApproval
    ? {
        toolName: proposal.requestedTool,
        approved: true,
        approvedAt: requestedAt,
        approvalScope,
      }
    : undefined;

  const policy = evaluateCareerAutomationPolicy({
    proposal,
    approval,
    toolApproval,
    executionPlan,
    toolInput: proposal.inputPreview,
    contextPayload: orchestration,
    provider,
    automationEnabled,
  });

  const automationPlan = buildCareerAutomationExecutionPlan({
    proposal,
    allowed: policy.allowed,
    blockedReasons: policy.allowed ? [] : [policy.code ?? "automation_not_allowed"],
  });

  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: policy.allowed ? "completed" : "blocked",
      code: "automation_policy_evaluated",
      message: policy.allowed ? "Automation policy evaluation passed." : policy.message ?? "Automation policy blocked.",
    }),
  );

  if (!policy.allowed) {
    return blockedResult({
      provider,
      proposalId: proposal.proposalId,
      kind: body.kind,
      toolName: proposal.requestedTool,
      code: policy.code ?? ("automation_not_allowed" as CareerAutomationPolicyBlockCode),
      message: policy.message ?? "Automation policy blocked the request.",
      trace,
    });
  }

  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "approval_validated",
      message: `Explicit ${approvalScope} approval validated for this proposal.`,
    }),
  );

  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "tool_permission_validated",
      message: `Tool permission validated for ${proposal.requestedTool}.`,
    }),
  );

  const toolInvocation: CareerToolInvokeBodyParsed = {
    agentRequestId,
    toolName: proposal.requestedTool,
    input: proposal.inputPreview,
    explicitApproval: true,
    approval: toolApproval,
    orchestration,
  };

  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "automation_execution_started",
      message: `Started single-purpose execution via ${provider} adapter.`,
    }),
  );

  let response;
  try {
    response = await adapter.execute({
      proposal,
      executionPlan: automationPlan,
      toolInvocation,
      timeoutMs: providerConfig.timeoutMs,
      requestedAt,
    });
  } catch {
    return blockedResult({
      provider,
      proposalId: proposal.proposalId,
      kind: body.kind,
      toolName: proposal.requestedTool,
      code: "automation_execution_failed",
      message: "Automation adapter execution failed safely.",
      trace,
    });
  }

  const externalCall = response.externalCall === true;

  if (!response.ok) {
    return {
      ...blockedResult({
        provider,
        proposalId: proposal.proposalId,
        kind: body.kind,
        toolName: proposal.requestedTool,
        code: response.error?.code ?? "automation_execution_failed",
        message: response.error?.message ?? "Automation execution did not complete.",
        trace,
      }),
      executedExternally: externalCall,
    };
  }

  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: externalCall ? "completed" : "simulated",
      code: "automation_execution_completed",
      message: externalCall
        ? `Automation completed via external ${provider} adapter.`
        : `Automation completed via local ${provider} adapter.`,
    }),
  );

  trace = appendCareerAutomationTraceStep(
    trace,
    createCareerAutomationTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "human_review_required",
      message: "Human review is required before any downstream action.",
    }),
  );

  return {
    status: "completed",
    provider,
    proposalId: proposal.proposalId,
    kind: body.kind,
    toolName: proposal.requestedTool,
    data: response.data,
    warnings: [],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: externalCall,
    backgroundExecution: false,
    scheduled: false,
    trace,
    observability: {
      provider,
      durationMs: response.durationMs ?? 0,
      automationKind: body.kind,
      toolName: proposal.requestedTool,
      validationStatus: "valid",
    },
  };
}
