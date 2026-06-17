import {
  orchestrateCareerAgents,
  parseCareerAgentOrchestrationBody,
  scanCareerAgentPayloadForForbiddenKeys,
  type CareerAgentOrchestrationBody,
  type CareerAgentResult,
} from "@devflow/career-core";

export const CAREER_AGENT_ORCHESTRATION_BLOCKED_MESSAGE =
  "Career agent orchestration is blocked until the request is valid and explicitly consented.";

export type CareerAgentOrchestrationRequestError = "invalid_json" | "invalid_request";

export function parseCareerAgentOrchestrationRequest(
  body: unknown,
):
  | { ok: true; request: CareerAgentOrchestrationBody }
  | { ok: false; error: CareerAgentOrchestrationRequestError } {
  if (body == null) {
    return { ok: false, error: "invalid_request" };
  }

  const parsed = parseCareerAgentOrchestrationBody(body);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  if (scanCareerAgentPayloadForForbiddenKeys(parsed.value).length > 0) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, request: parsed.value };
}

export function createBlockedCareerAgentResult(warningCode: string): CareerAgentResult {
  return {
    status: "blocked",
    agent: "career_orchestrator",
    summary: CAREER_AGENT_ORCHESTRATION_BLOCKED_MESSAGE,
    findings: [],
    recommendations: [],
    evidence: [],
    warnings: [{ code: "unsafe_context", message: warningCode }],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    rawProviderDataUsed: false,
    persisted: false,
    trace: {
      requestId: "blocked",
      steps: [],
    },
  };
}

export function handleCareerAgentOrchestration(
  request: CareerAgentOrchestrationBody,
  requestedAt: string,
): CareerAgentResult {
  return orchestrateCareerAgents(request, requestedAt);
}

export function resolveCareerAgentOrchestrationHttpStatus(result: CareerAgentResult): number {
  if (result.status === "blocked") {
    return 403;
  }

  if (result.status === "error") {
    return 500;
  }

  return 200;
}
