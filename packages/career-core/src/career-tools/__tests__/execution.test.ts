import { describe, expect, it } from "vitest";
import { buildCareerAgentContext } from "../../career-agents/context.js";
import { buildCareerAgentRequest } from "../../career-agents/request.js";
import { createSampleOrchestrationBody } from "../../career-agents/__tests__/fixtures.js";
import { invokeCareerTool } from "../invoke.js";
import { parseCareerToolInput } from "../schemas.js";
import { scanCareerAgentPayloadForForbiddenKeys } from "../../career-agents/security.js";
import { executeCareerToolPure } from "../executor.js";

const requestedAt = "2026-06-16T12:00:00.000Z";

describe("career tool execution", () => {
  it("validates strict input schemas", () => {
    expect(parseCareerToolInput("career.read_bundle", {}).success).toBe(true);
    expect(parseCareerToolInput("career.read_bundle", { extra: true }).success).toBe(false);
  });

  it("executes derive tools deterministically", () => {
    const orchestration = createSampleOrchestrationBody();
    const request = buildCareerAgentRequest(orchestration);
    const context = buildCareerAgentContext(request);

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

  it("invokes export preview with approval", () => {
    const orchestration = createSampleOrchestrationBody();
    const request = buildCareerAgentRequest(orchestration);
    const result = invokeCareerTool(
      {
        agentRequestId: request.requestId,
        toolName: "career.export_review_payload",
        input: { payloadType: "review_proposal", format: "json" },
        explicitApproval: true,
        orchestration,
        approval: {
          toolName: "career.export_review_payload",
          approved: true,
          approvedAt: requestedAt,
          approvalScope: "single_execution",
        },
      },
      requestedAt,
    );

    expect(result.status).toBe("completed");
    expect(result.executedExternally).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.reviewRequired).toBe(true);
    expect(scanCareerAgentPayloadForForbiddenKeys(result)).toEqual([]);
  });
});
