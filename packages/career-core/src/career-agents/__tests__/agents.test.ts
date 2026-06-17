import { describe, expect, it } from "vitest";
import { runApplicationAnalyst } from "../agents/application-analyst.js";
import { runInterviewCoach } from "../agents/interview-coach.js";
import { runProfileGapAnalyst } from "../agents/profile-gap-analyst.js";
import { buildCareerAgentContext } from "../context.js";
import { buildCareerAgentRequest } from "../request.js";
import { createSampleCareerBundle, createSampleOrchestrationBody } from "./fixtures.js";

describe("career agent deterministic outputs", () => {
  it("application analyst reports partial fit and missing skills", () => {
    const context = buildCareerAgentContext(
      buildCareerAgentRequest(createSampleOrchestrationBody()),
    );
    const first = runApplicationAnalyst(context);
    const second = runApplicationAnalyst(context);

    expect(first.summary).toContain("missing skill");
    expect(first.findings.some((finding) => finding.kind === "gap")).toBe(true);
    expect(first).toEqual(second);
  });

  it("profile gap analyst classifies technical and evidence gaps", () => {
    const context = buildCareerAgentContext(
      buildCareerAgentRequest(
        createSampleOrchestrationBody({
          intent: "analyze_profile_gaps",
          context: {
            careerBundle: createSampleCareerBundle(),
            selectedSignalIds: [],
            availableSignals: [],
          },
        }),
      ),
    );

    const output = runProfileGapAnalyst(context);
    expect(output.findings.map((finding) => finding.category)).toEqual([
      "technical",
      "evidence",
      "portfolio",
    ]);
  });

  it("interview coach returns ordered structured plan", () => {
    const context = buildCareerAgentContext(
      buildCareerAgentRequest(
        createSampleOrchestrationBody({
          intent: "prepare_interview",
        }),
      ),
    );

    const output = runInterviewCoach(context);
    expect(output.interviewPreparationProposal.mockInterviewPlan.length).toBeGreaterThan(0);
    expect(output.interviewPreparationProposal.starPrompts.length).toBeGreaterThan(0);
    expect(output.interviewPreparationProposal.studyTopics.length).toBeGreaterThan(0);
  });
});
