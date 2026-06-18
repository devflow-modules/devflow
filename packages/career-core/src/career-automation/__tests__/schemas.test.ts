import { describe, expect, it } from "vitest";
import { parseCareerAutomationExecuteBody } from "../schemas.js";
import { resolveCareerAutomationProposal } from "../proposal.js";
import { createSampleAutomationBody, createSampleCareerBundle } from "./fixtures.js";

describe("careerAutomationExecuteBodySchema", () => {
  it("accepts a valid request", () => {
    const parsed = parseCareerAutomationExecuteBody(createSampleAutomationBody());
    expect(parsed.ok).toBe(true);
  });

  it("rejects an unsupported kind", () => {
    const parsed = parseCareerAutomationExecuteBody({
      ...createSampleAutomationBody(),
      kind: "submit_application",
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects explicitApproval other than true", () => {
    const parsed = parseCareerAutomationExecuteBody({
      ...createSampleAutomationBody(),
      explicitApproval: false,
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects extra fields (client cannot author tool/provider/schedule)", () => {
    const parsed = parseCareerAutomationExecuteBody({
      ...createSampleAutomationBody(),
      toolName: "career.export_review_payload",
      schedule: "*/5 * * * *",
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects a forbidden approval scope", () => {
    const parsed = parseCareerAutomationExecuteBody({
      ...createSampleAutomationBody(),
      approvalScope: "always",
    });
    expect(parsed.ok).toBe(false);
  });

  it("derives a client-safe, non-executable proposal", () => {
    const proposal = resolveCareerAutomationProposal({
      kind: "prepare_interview_plan",
      agentRequestId: "career-agent::prepare_interview::x",
      context: { careerBundle: createSampleCareerBundle(), selectedSignalIds: [] },
    });

    expect(proposal.requestedTool).toBe("career.derive_interview_plan");
    expect(proposal.requiredCapability).toBe("derive_interview_plan");
    expect(proposal.reviewRequired).toBe(true);
    expect(proposal.riskLevel).toBe("derive");
    expect(typeof proposal.proposalId).toBe("string");
  });

  it("flags the export proposal as requiring explicit approval", () => {
    const proposal = resolveCareerAutomationProposal({
      kind: "prepare_review_export",
      agentRequestId: "career-agent::analyze_application_fit::x",
      context: { careerBundle: createSampleCareerBundle(), selectedSignalIds: [] },
    });

    expect(proposal.requestedTool).toBe("career.export_review_payload");
    expect(proposal.requiresExplicitApproval).toBe(true);
    expect(proposal.riskLevel).toBe("export");
  });
});
