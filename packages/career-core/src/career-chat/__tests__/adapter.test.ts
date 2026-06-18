import { describe, expect, it } from "vitest";
import { scanCareerChatPayloadForForbiddenKeys } from "../security.js";
import { runLibreChatCareerAdapter } from "../adapter.js";
import { normalizeCareerChatRequest } from "../normalize.js";
import { resolveCareerChatToolProposals } from "../tool-proposals.js";
import { createSampleLibreChatBody } from "./fixtures.js";

const requestedAt = "2026-06-16T12:00:00.000Z";

describe("LibreChat career adapter", () => {
  it("normalizes request deterministically", () => {
    const body = createSampleLibreChatBody({ conversationId: "conv-1" });
    const first = normalizeCareerChatRequest({ provider: "librechat", body });
    const second = normalizeCareerChatRequest({ provider: "librechat", body });
    expect(first).toEqual(second);
  });

  it("builds orchestration body and agent result", () => {
    const result = runLibreChatCareerAdapter({
      body: createSampleLibreChatBody(),
      requestedAt,
      adapterEnabled: true,
    });

    expect(result.status).toBe("completed");
    expect(result.agentResult?.status).toBe("completed");
    expect(result.intent).toBe("analyze_application_fit");
  });

  it("resolves tool proposals without executing tools", () => {
    const result = runLibreChatCareerAdapter({
      body: createSampleLibreChatBody(),
      requestedAt,
      adapterEnabled: true,
    });

    expect(result.toolProposals.length).toBeGreaterThan(0);
    expect(result.toolProposals.some((proposal) => proposal.status === "ready_for_review")).toBe(true);
    expect(result.executedExternally).toBe(false);
  });

  it("marks review proposal as ready_for_review when agent completed", () => {
    const normalized = normalizeCareerChatRequest({
      provider: "librechat",
      body: createSampleLibreChatBody({ action: "prepare_interview" }),
    });
    if (!normalized.ok) throw new Error("expected normalized");

    const proposals = resolveCareerChatToolProposals({
      intent: "prepare_interview",
      normalized: normalized.value,
      executionPlan: {
        selectedAgent: "interview_coach",
        reason: "test",
        requiredInputs: [],
        missingInputs: [],
        allowedCapabilities: ["derive_interview_plan", "create_review_proposal"],
        blockedCapabilities: [],
        reviewRequired: true,
      },
      agentCompleted: true,
    });

    expect(proposals.find((p) => p.toolName === "career.create_review_proposal")?.status).toBe(
      "ready_for_review",
    );
    expect(proposals.find((p) => p.toolName === "career.derive_interview_plan")?.status).toBe(
      "ready_for_review",
    );
  });

  it("requires human review in trace", () => {
    const result = runLibreChatCareerAdapter({
      body: createSampleLibreChatBody(),
      requestedAt,
      adapterEnabled: true,
    });

    expect(result.trace.steps.some((step) => step.code === "human_review_required")).toBe(true);
    expect(result.trace.steps.some((step) => step.code === "orchestration_completed")).toBe(true);
  });

  it("remains deterministic for identical input", () => {
    const body = createSampleLibreChatBody({ conversationId: "conv-deterministic" });
    const first = runLibreChatCareerAdapter({ body, requestedAt, adapterEnabled: true });
    const second = runLibreChatCareerAdapter({ body, requestedAt, adapterEnabled: true });

    expect(first.status).toBe(second.status);
    expect(first.agentResult?.summary).toBe(second.agentResult?.summary);
    expect(first.toolProposals).toEqual(second.toolProposals);
  });

  it("blocks disabled adapter", () => {
    const result = runLibreChatCareerAdapter({
      body: createSampleLibreChatBody(),
      requestedAt,
      adapterEnabled: false,
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings.some((warning) => warning.code === "librechat_adapter_disabled")).toBe(true);
    expect(result.agentResult).toBeNull();
  });

  it("returns client-safe payload", () => {
    const result = runLibreChatCareerAdapter({
      body: createSampleLibreChatBody(),
      requestedAt,
      adapterEnabled: true,
    });

    expect(scanCareerChatPayloadForForbiddenKeys(result)).toEqual([]);
    expect(result.reviewRequired).toBe(true);
    expect(result.hasToken).toBe(false);
  });
});
