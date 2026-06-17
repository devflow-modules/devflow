import {
  invokeCareerTool,
  parseCareerToolInvokeBody,
  scanCareerAgentPayloadForForbiddenKeys,
  type CareerToolExecutionResult,
  type CareerToolInvokeBodyParsed,
} from "@devflow/career-core";

export const CAREER_TOOL_INVOKE_BLOCKED_MESSAGE =
  "Career tool invocation is blocked until policy validation and approval succeed.";

export type CareerToolInvokeRequestError = "invalid_json" | "invalid_request";

export function parseCareerToolInvokeRequest(
  body: unknown,
):
  | { ok: true; request: CareerToolInvokeBodyParsed }
  | { ok: false; error: CareerToolInvokeRequestError } {
  if (body == null) {
    return { ok: false, error: "invalid_request" };
  }

  const parsed = parseCareerToolInvokeBody(body);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  if (scanCareerAgentPayloadForForbiddenKeys(parsed.value).length > 0) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, request: parsed.value };
}

export function createBlockedCareerToolResult(warningCode: string): CareerToolExecutionResult {
  return {
    status: "blocked",
    toolName: "unknown",
    data: {},
    warnings: [{ code: warningCode, message: CAREER_TOOL_INVOKE_BLOCKED_MESSAGE }],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    trace: {
      requestId: "blocked",
      toolName: "unknown",
      steps: [],
    },
  };
}

export function handleCareerToolInvoke(
  request: CareerToolInvokeBodyParsed,
  requestedAt: string,
): CareerToolExecutionResult {
  return invokeCareerTool(request, requestedAt);
}

export function resolveCareerToolInvokeHttpStatus(result: CareerToolExecutionResult): number {
  if (result.status === "blocked") {
    return 403;
  }

  if (result.status === "error") {
    return 500;
  }

  return 200;
}
