import { describe, expect, it } from "vitest";
import { executeCareerAutomation } from "../adapter.js";
import { createMockCareerAutomationAdapter } from "../mock-adapter.js";
import type { CareerAutomationExecuteBody } from "../schemas.js";
import type { CareerAutomationKind } from "../types.js";
import { createMockAutomationProviderConfig, createSampleAutomationBody } from "./fixtures.js";

const REQUESTED_AT = "2026-06-17T10:00:00.000Z";

function run(overrides: {
  body?: CareerAutomationExecuteBody;
  automationEnabled?: boolean;
} = {}) {
  return executeCareerAutomation({
    body: overrides.body ?? createSampleAutomationBody(),
    requestedAt: REQUESTED_AT,
    automationEnabled: overrides.automationEnabled ?? true,
    providerConfig: createMockAutomationProviderConfig(),
    adapter: createMockCareerAutomationAdapter(),
  });
}

const KINDS: CareerAutomationKind[] = [
  "prepare_application_review",
  "prepare_profile_gap_review",
  "prepare_interview_plan",
  "prepare_review_export",
];

describe("executeCareerAutomation", () => {
  it.each(KINDS)("completes %s with a client-safe result", async (kind) => {
    const result = await run({ body: createSampleAutomationBody({ kind }) });
    expect(result.status).toBe("completed");
    expect(result.kind).toBe(kind);
    expect(result.reviewRequired).toBe(true);
    expect(result.safeForClient).toBe(true);
    expect(result.hasToken).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.scheduled).toBe(false);
    expect(result.backgroundExecution).toBe(false);
    expect(result.executedExternally).toBe(false);
  });

  it("is deterministic for the same input", async () => {
    const first = await run();
    const second = await run();
    expect(first.data).toEqual(second.data);
    expect(first.toolName).toEqual(second.toolName);
  });

  it("blocks when the flag is disabled", async () => {
    const result = await run({ automationEnabled: false });
    expect(result.status).toBe("blocked");
    expect(result.warnings.some((w) => w.code === "automation_disabled")).toBe(true);
  });

  it("emits the controlled trace steps in order", async () => {
    const result = await run();
    const codes = result.trace.steps.map((step) => step.code);
    expect(codes).toEqual([
      "automation_request_received",
      "proposal_resolved",
      "execution_plan_resolved",
      "automation_policy_evaluated",
      "approval_validated",
      "tool_permission_validated",
      "automation_execution_started",
      "automation_execution_completed",
      "human_review_required",
    ]);
  });

  it("blocks an approval that does not match the resolved proposal", async () => {
    const result = await run({
      body: createSampleAutomationBody({ proposalId: "spoofed-proposal-id" }),
    });
    expect(result.status).toBe("blocked");
    expect(result.warnings.some((w) => w.code === "approval_proposal_mismatch")).toBe(true);
  });

  it("never reports scheduling or background execution", async () => {
    const result = await run();
    expect(result.scheduled).toBe(false);
    expect(result.backgroundExecution).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/cron|scheduler|setInterval/);
  });

  it("does not leak that the client called the tool endpoint", async () => {
    const result = await run();
    expect(JSON.stringify(result)).not.toMatch(/career-tools\/invoke/);
  });
});
