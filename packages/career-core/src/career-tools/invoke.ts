import { buildCareerAgentContext } from "../career-agents/context.js";
import { buildCareerAgentRequest } from "../career-agents/request.js";
import { parseCareerAgentOrchestrationBody } from "../career-agents/schemas.js";
import { scanCareerAgentPayloadForForbiddenKeys } from "../career-agents/security.js";
import { executeCareerToolPure } from "./executor.js";
import {
  buildToolExecutionPlan,
  evaluateCareerToolPermission,
  resolveExecutionPlanFromOrchestration,
} from "./permission.js";
import { isCareerToolName, resolveCareerToolDefinition } from "./registry.js";
import {
  careerToolInvokeBodySchema,
  parseCareerToolInput,
} from "./schemas.js";
import {
  appendCareerToolTraceStep,
  createCareerToolTrace,
  createCareerToolTraceStep,
} from "./trace.js";
import type { CareerAgentOrchestrationBody } from "../career-agents/schemas.js";
import type { CareerToolApproval, CareerToolExecutionResult } from "./types.js";

export type CareerToolInvokeBodyParsed = {
  agentRequestId: string;
  toolName: string;
  input: Record<string, unknown>;
  explicitApproval: true;
  approval?: CareerToolApproval;
  orchestration: CareerAgentOrchestrationBody;
};

export function parseCareerToolInvokeBody(
  body: unknown,
):
  | { ok: true; value: CareerToolInvokeBodyParsed }
  | { ok: false; error: "invalid_request" } {
  const parsed = careerToolInvokeBodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_request" };
  }

  if (scanCareerAgentPayloadForForbiddenKeys(parsed.data).length > 0) {
    return { ok: false, error: "invalid_request" };
  }

  const orchestration = parseCareerAgentOrchestrationBody(parsed.data.orchestration);
  if (!orchestration.ok) {
    return { ok: false, error: "invalid_request" };
  }

  return {
    ok: true,
    value: {
      ...parsed.data,
      orchestration: orchestration.value,
      approval: parsed.data.approval as CareerToolApproval | undefined,
    },
  };
}

function blockedResult(input: {
  toolName: CareerToolExecutionResult["toolName"];
  requestId: string;
  code: string;
  message: string;
  trace: CareerToolExecutionResult["trace"];
}): CareerToolExecutionResult {
  return {
    status: "blocked",
    toolName: input.toolName,
    data: {},
    warnings: [{ code: input.code, message: input.message }],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    trace: input.trace,
  };
}

export function invokeCareerTool(body: CareerToolInvokeBodyParsed, requestedAt: string): CareerToolExecutionResult {
  const toolName = body.toolName;
  let trace = createCareerToolTrace(body.agentRequestId, isCareerToolName(toolName) ? toolName : "unknown");

  trace = appendCareerToolTraceStep(
    trace,
    createCareerToolTraceStep({
      timestamp: requestedAt,
      status: isCareerToolName(toolName) ? "completed" : "blocked",
      code: "tool_resolved",
      message: isCareerToolName(toolName) ? `Resolved tool ${toolName}.` : "Unknown tool.",
    }),
  );

  if (!isCareerToolName(toolName)) {
    return blockedResult({
      toolName: "unknown",
      requestId: body.agentRequestId,
      code: "unsupported_tool",
      message: "Tool is not registered.",
      trace,
    });
  }

  const definition = resolveCareerToolDefinition(toolName)!;
  buildToolExecutionPlan(definition);

  const planResolution = resolveExecutionPlanFromOrchestration(body.orchestration, body.agentRequestId);
  trace = appendCareerToolTraceStep(
    trace,
    createCareerToolTraceStep({
      timestamp: requestedAt,
      status: planResolution.ok ? "completed" : "blocked",
      code: "capability_checked",
      message: planResolution.ok
        ? "Execution plan reconstructed deterministically."
        : planResolution.message,
    }),
  );

  if (!planResolution.ok) {
    return blockedResult({
      toolName,
      requestId: body.agentRequestId,
      code: planResolution.code,
      message: planResolution.message,
      trace,
    });
  }

  const request = buildCareerAgentRequest(body.orchestration);
  const context = buildCareerAgentContext(request);

  const parsedInput = parseCareerToolInput(toolName, body.input);
  trace = appendCareerToolTraceStep(
    trace,
    createCareerToolTraceStep({
      timestamp: requestedAt,
      status: parsedInput.success ? "completed" : "blocked",
      code: "schema_validated",
      message: parsedInput.success ? "Input schema validated." : "Input schema validation failed.",
    }),
  );

  const permission = evaluateCareerToolPermission({
    toolName,
    inputPayload: body.input,
    approval: body.approval,
    executionPlan: planResolution.executionPlan,
    contextPayload: body.orchestration,
  });

  trace = appendCareerToolTraceStep(
    trace,
    createCareerToolTraceStep({
      timestamp: requestedAt,
      status: permission.allowed ? "completed" : "blocked",
      code: "approval_checked",
      message: permission.message ?? "Permission evaluation completed.",
    }),
  );

  if (!permission.allowed || !parsedInput.success) {
    return blockedResult({
      toolName,
      requestId: body.agentRequestId,
      code: permission.code ?? "invalid_tool_input",
      message: permission.message ?? "Tool invocation blocked.",
      trace,
    });
  }

  trace = appendCareerToolTraceStep(
    trace,
    createCareerToolTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "execution_started",
      message: `Started local pure execution for ${toolName}.`,
    }),
  );

  const data = executeCareerToolPure({
    toolName,
    parsedInput: parsedInput.data,
    context,
    agentRequestId: body.agentRequestId,
    requestedAt,
  });

  trace = appendCareerToolTraceStep(
    trace,
    createCareerToolTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "execution_completed",
      message: "Local pure execution completed.",
    }),
  );

  trace = appendCareerToolTraceStep(
    trace,
    createCareerToolTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "review_required",
      message: "Human review is required before any downstream action.",
    }),
  );

  return {
    status: "completed",
    toolName,
    data,
    warnings: [],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    trace,
  };
}
