import { describe, expect, it } from "vitest";
import { orchestrateCareerAgents } from "../orchestrator.js";
import { parseCareerAgentOrchestrationBody } from "../schemas.js";
import { scanCareerAgentPayloadForForbiddenKeys } from "../security.js";
import { createSampleCareerBundle, createSampleOrchestrationBody } from "./fixtures.js";

const requestedAt = "2026-06-16T12:00:00.000Z";

describe("orchestrateCareerAgents", () => {
  it("completes application fit analysis", () => {
    const result = orchestrateCareerAgents(createSampleOrchestrationBody(), requestedAt);

    expect(result.status).toBe("completed");
    expect(result.agent).toBe("application_analyst");
    expect(result.reviewRequired).toBe(true);
    expect(result.safeForClient).toBe(true);
    expect(result.hasToken).toBe(false);
    expect(result.trace.steps.map((step) => step.code)).toEqual([
      "request_validated",
      "policy_evaluated",
      "agent_selected",
      "capabilities_resolved",
      "execution_completed",
      "review_required",
    ]);
  });

  it("blocks without consent in parsed body", () => {
    const parsed = parseCareerAgentOrchestrationBody({
      intent: "analyze_application_fit",
      explicitConsent: false,
      context: {
        careerBundle: createSampleCareerBundle(),
        selectedSignalIds: [],
      },
    });

    expect(parsed.ok).toBe(false);
  });

  it("warns when no provider signals are selected", () => {
    const result = orchestrateCareerAgents(
      createSampleOrchestrationBody({
        context: {
          careerBundle: createSampleCareerBundle(),
          selectedSignalIds: [],
          availableSignals: [],
        },
      }),
      requestedAt,
    );

    expect(result.warnings.some((warning) => warning.code === "no_provider_signals_selected")).toBe(true);
  });

  it("blocks agent intent mismatch", () => {
    const result = orchestrateCareerAgents(
      createSampleOrchestrationBody({
        intent: "prepare_interview",
        requestedAgent: "application_analyst",
      }),
      requestedAt,
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings[0]?.code).toBe("agent_intent_mismatch");
  });

  it("returns interview preparation proposal for interview coach", () => {
    const result = orchestrateCareerAgents(
      createSampleOrchestrationBody({
        intent: "prepare_interview",
      }),
      requestedAt,
    );

    expect(result.agent).toBe("interview_coach");
    expect(result.interviewPreparationProposal?.reviewRequired).toBe(true);
    expect(result.interviewPreparationProposal?.inMemory).toBe(true);
  });

  it("keeps serialized payloads free of forbidden keys", () => {
    const result = orchestrateCareerAgents(createSampleOrchestrationBody(), requestedAt);
    expect(scanCareerAgentPayloadForForbiddenKeys(result)).toEqual([]);
  });
});
