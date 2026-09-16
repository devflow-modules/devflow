import { describe, expect, it } from "vitest";

import { captureApplicationDecisionSnapshot, gustavoProfile, type ApplicationOutcome, type ApplyFlowJob } from "@devflow/applyflow-core";

import { buildCareerAnalyticsInput, historicalDecisionsFromJobs } from "./career-analytics-dataset";

const NOW = new Date("2026-09-09T12:00:00.000Z");

const job: ApplyFlowJob = {
  id: "job-live",
  title: "Staff Elixir Engineer",
  company: "Acme",
  url: "https://jobs.example/elixir",
  source: "paste",
  status: "reviewing",
  descriptionSnapshot: "Staff Elixir Engineer. Production Phoenix, OTP, and distributed systems.",
  jobContext: { skills: ["Elixir", "Phoenix"] },
  jobMatch: {
    score: 40,
    decision: "skip",
    matchedSkills: [],
    missingSkills: ["Elixir"],
    evaluatedAt: NOW.toISOString(),
    scoringVersion: "v1",
  },
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

const snapshot = captureApplicationDecisionSnapshot({
  decision: {
    scoringVersion: "v2",
    decision: "apply_stretch",
    overall: 61,
    dimensions: {
      overall: 61,
      coreEngineering: 70,
      stack: 20,
      specialization: 40,
      seniority: 80,
      product: 75,
    },
    confidence: "medium",
    hiringProbability: "medium",
    careerUpside: "high",
    applicationCost: "high",
    opportunityCost: "medium",
    eliminationRisk: "high",
    priority: 55,
    matches: [
      {
        requirement: {
          id: "req-elixir",
          label: "Elixir",
          category: "backend",
          importance: "fundamental",
          requirementType: "skill",
        },
        status: "gap",
        matchedEvidence: [],
        reason: "captured gap",
      },
    ],
    claims: [],
    recommendedClaims: [],
    gates: [],
    candidateInputRequests: [],
    reasons: ["snapshot"],
  },
  supportingEvidenceIds: ["seed-investigamais"],
  primaryCaseIds: ["seed-investigamais"],
  now: NOW,
});

const application = {
  id: "app-historical",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  source: "paste" as const,
  status: "applied" as const,
  jobTitle: job.title,
  jobUrl: job.url,
  v2: { sourceJobId: job.id },
};

const outcome: ApplicationOutcome = {
  applicationId: application.id,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  snapshot,
  fitAtApplication: snapshot.overallFit,
  decisionAtApplication: snapshot.decision,
};

describe("career-analytics-dataset historical snapshot", () => {
  it("does not re-evaluate the live profile when a snapshot exists", () => {
    const records = historicalDecisionsFromJobs({
      jobs: [job],
      applications: [application],
      outcomes: [outcome],
      profile: gustavoProfile,
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.applicationId).toBe("app-historical");
    expect(records[0]?.matches[0]?.status).toBe("gap");
    expect(records[0]?.matches[0]?.label).toBe("Elixir");
    expect(outcome.snapshot?.overallFit).toBe(61);
    expect(outcome.fitAtApplication).toBe(61);
  });

  it("builds analytics input from snapshot IDs without treating job id as application id", () => {
    const input = buildCareerAnalyticsInput({
      applications: [application],
      jobs: [job],
      outcomes: [outcome],
      profile: gustavoProfile,
      now: NOW,
    });
    expect(input.decisions?.[0]?.applicationId).toBe("app-historical");
    expect(input.decisions?.[0]?.applicationId).not.toBe(job.id);
    expect(input.outcomes?.[0]?.snapshot?.supportingEvidenceIds).toEqual(["seed-investigamais"]);
  });
});
