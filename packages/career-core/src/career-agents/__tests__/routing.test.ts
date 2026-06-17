import { describe, expect, it } from "vitest";
import { selectCareerAgent } from "../execution-plan.js";
import { resolveCareerAgentForIntent } from "../routing.js";
import { buildCareerAgentRequest } from "../request.js";
import { createSampleOrchestrationBody } from "./fixtures.js";

describe("career agent routing", () => {
  it("routes application fit to application analyst", () => {
    expect(resolveCareerAgentForIntent("analyze_application_fit")).toBe("application_analyst");
  });

  it("routes profile gaps to profile gap analyst", () => {
    expect(resolveCareerAgentForIntent("analyze_profile_gaps")).toBe("profile_gap_analyst");
  });

  it("routes interview prep to interview coach", () => {
    expect(resolveCareerAgentForIntent("prepare_interview")).toBe("interview_coach");
  });

  it("blocks incompatible requested agent", () => {
    const request = buildCareerAgentRequest(
      createSampleOrchestrationBody({
        intent: "analyze_application_fit",
        requestedAgent: "interview_coach",
      }),
    );

    expect(selectCareerAgent(request)).toMatchObject({
      ok: false,
      code: "agent_intent_mismatch",
    });
  });

  it("blocks career orchestrator as requested agent", () => {
    const request = buildCareerAgentRequest(
      createSampleOrchestrationBody({
        requestedAgent: "career_orchestrator",
      }),
    );

    expect(selectCareerAgent(request)).toMatchObject({
      ok: false,
      code: "unsupported_agent",
    });
  });
});
