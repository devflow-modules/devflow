import { runApplicationAnalyst } from "./agents/application-analyst.js";
import { runInterviewCoach } from "./agents/interview-coach.js";
import { runProfileGapAnalyst } from "./agents/profile-gap-analyst.js";
import { buildCareerAgentContext } from "./context.js";
import { buildCareerAgentExecutionPlan, selectCareerAgent } from "./execution-plan.js";
import { evaluateCareerAgentPolicy } from "./policy.js";
import { buildCareerAgentRequest } from "./request.js";
import type { CareerAgentOrchestrationBody } from "./schemas.js";
import {
  appendCareerAgentTraceStep,
  createCareerAgentTraceStep,
  createInitialCareerAgentTrace,
} from "./trace.js";
import type {
  CareerAgentKind,
  CareerAgentResult,
  CareerAgentTrace,
  CareerAgentWarning,
} from "./types.js";

function blockedResult(input: {
  requestId: string;
  agent: CareerAgentKind;
  summary: string;
  warnings: CareerAgentWarning[];
  trace: CareerAgentTrace;
  executionPlan?: CareerAgentResult["executionPlan"];
}): CareerAgentResult {
  return {
    status: "blocked",
    agent: input.agent,
    summary: input.summary,
    findings: [],
    recommendations: [],
    evidence: [],
    warnings: input.warnings,
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    rawProviderDataUsed: false,
    persisted: false,
    trace: input.trace,
    executionPlan: input.executionPlan,
  };
}

function withWarnings(
  warnings: CareerAgentWarning[],
  selectedSignalCount: number,
): CareerAgentWarning[] {
  if (selectedSignalCount > 0) {
    return warnings;
  }

  return [
    ...warnings,
    {
      code: "no_provider_signals_selected",
      message: "No provider signals were selected; analysis uses CareerBundle only.",
    },
  ];
}

export function orchestrateCareerAgents(
  body: CareerAgentOrchestrationBody,
  requestedAt: string,
): CareerAgentResult {
  const request = buildCareerAgentRequest(body);
  const context = buildCareerAgentContext(request);

  let trace = createInitialCareerAgentTrace(request.requestId);
  trace = appendCareerAgentTraceStep(
    trace,
    createCareerAgentTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "request_validated",
      message: "Structured agent request validated.",
    }),
  );

  const policy = evaluateCareerAgentPolicy(request, context);
  trace = appendCareerAgentTraceStep(
    trace,
    createCareerAgentTraceStep({
      timestamp: requestedAt,
      status: policy.allowed ? "completed" : "blocked",
      code: "policy_evaluated",
      message: policy.allowed ? "Policy evaluation passed." : policy.message ?? "Policy evaluation blocked.",
    }),
  );

  if (!policy.allowed) {
    return blockedResult({
      requestId: request.requestId,
      agent: "career_orchestrator",
      summary: "Agent orchestration blocked by policy.",
      warnings: [
        {
          code: policy.code ?? "unsafe_context",
          message: policy.message ?? "Policy blocked the request.",
        },
      ],
      trace,
    });
  }

  const selection = selectCareerAgent(request);
  if (!selection.ok) {
    trace = appendCareerAgentTraceStep(
      trace,
      createCareerAgentTraceStep({
        timestamp: requestedAt,
        status: "blocked",
        code: "agent_selected",
        message: selection.message,
      }),
    );

    return blockedResult({
      requestId: request.requestId,
      agent: request.requestedAgent ?? "career_orchestrator",
      summary: "Agent selection blocked.",
      warnings: [
        {
          code: selection.code,
          message: selection.message,
        },
      ],
      trace,
    });
  }

  const executionPlan = buildCareerAgentExecutionPlan({
    agent: selection.agent,
    reason: selection.reason,
    intent: request.intent,
    context,
  });

  if (executionPlan.missingInputs.length > 0) {
    trace = appendCareerAgentTraceStep(
      trace,
      createCareerAgentTraceStep({
        timestamp: requestedAt,
        status: "blocked",
        code: "capabilities_resolved",
        message: `Missing required inputs: ${executionPlan.missingInputs.join(", ")}`,
      }),
    );

    return blockedResult({
      requestId: request.requestId,
      agent: selection.agent,
      summary: "Required inputs are missing for agent execution.",
      warnings: [
        {
          code: "missing_required_input",
          message: `Missing inputs: ${executionPlan.missingInputs.join(", ")}`,
        },
      ],
      trace,
      executionPlan,
    });
  }

  trace = appendCareerAgentTraceStep(
    trace,
    createCareerAgentTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "agent_selected",
      message: `Selected agent ${selection.agent}.`,
    }),
  );

  trace = appendCareerAgentTraceStep(
    trace,
    createCareerAgentTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "capabilities_resolved",
      message: `Allowed capabilities: ${executionPlan.allowedCapabilities.join(", ")}`,
    }),
  );

  const warnings = withWarnings([], context.selectedSignalIds.length);

  let output:
    | ReturnType<typeof runApplicationAnalyst>
    | ReturnType<typeof runProfileGapAnalyst>
    | ReturnType<typeof runInterviewCoach>;

  switch (selection.agent) {
    case "application_analyst":
      output = runApplicationAnalyst(context);
      break;
    case "profile_gap_analyst":
      output = runProfileGapAnalyst(context);
      break;
    case "interview_coach":
      output = runInterviewCoach(context);
      break;
    default:
      return blockedResult({
        requestId: request.requestId,
        agent: "career_orchestrator",
        summary: "Unsupported agent execution path.",
        warnings: [{ code: "unsupported_agent", message: "Agent execution is not supported." }],
        trace,
      });
  }

  trace = appendCareerAgentTraceStep(
    trace,
    createCareerAgentTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "execution_completed",
      message: `Agent ${selection.agent} completed deterministic execution.`,
    }),
  );

  trace = appendCareerAgentTraceStep(
    trace,
    createCareerAgentTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "review_required",
      message: "Human review is required before any downstream action.",
    }),
  );

  return {
    status: "completed",
    agent: selection.agent,
    summary: output.summary,
    findings: output.findings,
    recommendations: output.recommendations,
    evidence: output.evidence,
    warnings,
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    rawProviderDataUsed: false,
    persisted: false,
    trace,
    executionPlan,
    interviewPreparationProposal:
      "interviewPreparationProposal" in output ? output.interviewPreparationProposal : undefined,
  };
}
