import { describe, expect, it } from "vitest";

import { createApplicationFromJob, resolveApplicationRegistration } from "../application-identity.js";
import { deriveApplicationReadiness } from "../application-readiness.js";
import type { JobDecisionV2 } from "../application-decision-types.js";
import { createResumeLibraryFromProfile } from "../resume-library.js";
import { gustavoProfile } from "../candidate-profile.js";
import type { ApplyFlowJob } from "../job-match-types.js";

const NOW = "2026-09-09T12:00:00.000Z";

const decision: JobDecisionV2 = {
  scoringVersion: "v2",
  decision: "apply_high",
  overall: 88,
  dimensions: {
    overall: 88,
    coreEngineering: 90,
    stack: 85,
    specialization: 80,
    seniority: 84,
    product: 92,
  },
  confidence: "high",
  hiringProbability: "high",
  careerUpside: "high",
  applicationCost: "medium",
  opportunityCost: "low",
  eliminationRisk: "low",
  priority: 86,
  matches: [],
  claims: [],
  recommendedClaims: [],
  gates: [],
  candidateInputRequests: [],
  reasons: ["fixture"],
};

function baseJob(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job_readiness",
    title: "Product Engineer",
    company: "Acme",
    url: "https://jobs.example/acme",
    source: "paste",
    status: "reviewing",
    jobContext: { skills: ["React", "TypeScript"] },
    jobMatch: {
      score: 90,
      decision: "apply",
      matchedSkills: ["React", "TypeScript"],
      missingSkills: [],
      evaluatedAt: NOW,
      scoringVersion: "v1",
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function library() {
  return createResumeLibraryFromProfile(gustavoProfile, {
    name: "Default CV",
    id: "rv_default",
    now: new Date(NOW),
  });
}

describe("deriveApplicationReadiness", () => {
  it("marks analyzed ready when match is current", () => {
    const readiness = deriveApplicationReadiness({ job: baseJob(), resumeLibrary: library() });
    expect(readiness.items.find((item) => item.id === "analyzed")).toMatchObject({
      state: "ready",
      reason: "match_present",
    });
    expect(readiness.hasStaleMatch).toBe(false);
  });

  it("marks analyzed attention when match is stale", () => {
    const lib = library();
    const variant = lib.variants[0]!;
    const staleLib = {
      ...lib,
      variants: [{ ...variant, updatedAt: "2026-10-01T00:00:00.000Z" }],
    };
    const job = baseJob({
      evaluatedWith: { variantId: variant.id, variantName: variant.name },
      jobMatch: {
        score: 90,
        decision: "apply",
        matchedSkills: ["React"],
        missingSkills: [],
        evaluatedAt: "2026-01-01T00:00:00.000Z",
        scoringVersion: "v1",
      },
    });
    const readiness = deriveApplicationReadiness({ job, resumeLibrary: staleLib });
    expect(readiness.hasStaleMatch).toBe(true);
    expect(readiness.items.find((item) => item.id === "analyzed")?.state).toBe("attention");
  });

  it("exposes recommended and selected curriculum without conflating them", () => {
    const job = baseJob({
      evaluatedWith: { variantId: "rv_default", variantName: "Default CV" },
      curriculumRecommendation: {
        recommendedVariantId: "rv_full",
        recommendedVariantName: "Full Stack",
        evaluatedAt: NOW,
        scoringVersion: "v1",
        routerVersion: "curriculum-router-v1",
        confidence: "clear",
        scoreDelta: 10,
        candidates: [],
      },
      applicationPack: {
        version: 1,
        packVersion: "application-pack-v1",
        createdAt: NOW,
        updatedAt: NOW,
        jobId: "job_readiness",
        resume: { variantId: "rv_default", variantName: "Default CV", recommendedByRouter: false },
        match: {
          score: 90,
          decision: "apply",
          matchedSkills: ["React"],
          missingSkills: [],
          scoringVersion: "v1",
        },
        highlights: ["React"],
        gaps: [],
        candidateFacts: {},
        checklist: [],
      },
    });
    const readiness = deriveApplicationReadiness({ job, resumeLibrary: library() });
    expect(readiness.recommendedResumeVariantName).toBe("Full Stack");
    expect(readiness.selectedResumeVariantName).toBe("Default CV");
    expect(readiness.evaluatedWithVariantName).toBe("Default CV");
  });

  it("flags missing and unknown skills as attention without inventing a score", () => {
    const withMissing = deriveApplicationReadiness({
      job: baseJob({
        jobMatch: {
          score: 60,
          decision: "stretch",
          matchedSkills: ["React"],
          missingSkills: ["AWS", "K8s"],
          evaluatedAt: NOW,
          scoringVersion: "v1",
        },
      }),
      resumeLibrary: library(),
    });
    expect(withMissing.items.find((item) => item.id === "gaps")).toMatchObject({
      state: "attention",
      reason: "missing_skills",
      detail: "2",
    });
    expect(Object.prototype.hasOwnProperty.call(withMissing, "readinessScore")).toBe(false);

    const withUnknown = deriveApplicationReadiness({
      job: baseJob({
        jobMatch: {
          score: 40,
          decision: "needs_info",
          matchedSkills: [],
          missingSkills: [],
          unknownSkills: ["GraphQL"],
          evaluatedAt: NOW,
          scoringVersion: "v1",
        },
      }),
      resumeLibrary: library(),
    });
    expect(withUnknown.items.find((item) => item.id === "gaps")?.reason).toBe("unknown_skills");
  });

  it("tracks source, application registration, and submission states", () => {
    const none = deriveApplicationReadiness({
      job: baseJob({ url: undefined }),
      resumeLibrary: library(),
    });
    expect(none.hasSourceUrl).toBe(false);
    expect(none.items.find((item) => item.id === "application")?.reason).toBe("application_not_registered");
    expect(none.items.find((item) => item.id === "submission")?.reason).toBe("not_submitted");

    const registered = createApplicationFromJob({
      job: baseJob(),
      decision,
      now: new Date(NOW),
    }).application;
    const withApp = deriveApplicationReadiness({
      job: baseJob(),
      resumeLibrary: library(),
      application: registered,
    });
    expect(withApp.hasApplication).toBe(true);
    expect(withApp.items.find((item) => item.id === "submission")?.reason).toBe("tracking_only");

    const submitted = { ...registered, status: "applied" as const };
    const withSent = deriveApplicationReadiness({
      job: baseJob(),
      resumeLibrary: library(),
      application: submitted,
    });
    expect(withSent.items.find((item) => item.id === "submission")?.reason).toBe("externally_submitted");
  });
});

describe("resolveApplicationRegistration", () => {
  it("creates once and returns existing on second call (sourceJobId)", () => {
    const job = baseJob();
    const first = resolveApplicationRegistration({
      applications: [],
      job,
      decision,
      now: new Date(NOW),
    });
    expect(first.kind).toBe("created");
    if (first.kind !== "created") return;
    expect(first.application.status).toBe("reviewing");
    expect(first.application.v2?.sourceJobId).toBe(job.id);

    const second = resolveApplicationRegistration({
      applications: [first.application],
      job,
      decision,
      now: new Date("2026-09-10T12:00:00.000Z"),
    });
    expect(second.kind).toBe("existing");
    if (second.kind !== "existing") return;
    expect(second.application.id).toBe(first.application.id);
  });

  it("finds existing application by jobUrl fallback", () => {
    const job = baseJob({ id: "job_new_id" });
    const orphan = createApplicationFromJob({
      job: baseJob({ id: "job_old" }),
      decision,
      now: new Date(NOW),
    }).application;
    const byUrlOnly = {
      ...orphan,
      v2: { ...orphan.v2, sourceJobId: undefined },
      jobUrl: job.url,
    };
    const resolved = resolveApplicationRegistration({
      applications: [byUrlOnly],
      job,
      decision,
      now: new Date(NOW),
    });
    expect(resolved.kind).toBe("existing");
    if (resolved.kind !== "existing") return;
    expect(resolved.application.id).toBe(byUrlOnly.id);
  });
});
