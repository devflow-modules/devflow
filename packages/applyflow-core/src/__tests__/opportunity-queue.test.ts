import { describe, expect, it } from "vitest";

import type { ApplyFlowJob } from "../job-match-types.js";
import {
  countOpportunityQueueViews,
  filterJobsByQueueView,
  ignoreApplyFlowJob,
  isActiveOpportunityJob,
  restoreApplyFlowJobToQueue,
  selectOpportunityQueueJobs,
  sortOpportunityJobs,
} from "../opportunity-queue.js";

const NOW = "2026-08-13T12:00:00.000Z";
const EARLIER = "2026-08-10T12:00:00.000Z";

function job(partial: Partial<ApplyFlowJob> & Pick<ApplyFlowJob, "id" | "status">): ApplyFlowJob {
  return {
    title: partial.title ?? "Role",
    source: partial.source ?? "paste",
    jobContext: partial.jobContext ?? { skills: ["React"] },
    jobMatch: partial.jobMatch ?? {
      score: 70,
      decision: "stretch",
      matchedSkills: ["React"],
      missingSkills: [],
      evaluatedAt: NOW,
      scoringVersion: "v1",
    },
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
    ...partial,
  };
}

describe("isActiveOpportunityJob", () => {
  it("treats only reviewing as active regardless of match decision", () => {
    expect(isActiveOpportunityJob(job({ id: "a", status: "reviewing", jobMatch: {
      score: 10, decision: "skip", matchedSkills: [], missingSkills: ["Java"], evaluatedAt: NOW, scoringVersion: "v1",
    } }))).toBe(true);
    for (const status of [
      "ignored",
      "applied",
      "waiting_response",
      "interview",
      "technical_test",
      "rejected",
      "accepted",
      "hired",
    ] as const) {
      expect(isActiveOpportunityJob(job({ id: status, status }))).toBe(false);
    }
  });
});

describe("opportunity queue views", () => {
  const jobs = [
    job({ id: "r", status: "reviewing" }),
    job({ id: "i", status: "ignored" }),
    job({ id: "a", status: "applied" }),
  ];

  it("counts views from the jobs array", () => {
    expect(countOpportunityQueueViews(jobs)).toEqual({ active: 1, all: 3, ignored: 1 });
  });

  it("filters by view", () => {
    expect(filterJobsByQueueView(jobs, "active").map((item) => item.id)).toEqual(["r"]);
    expect(filterJobsByQueueView(jobs, "ignored").map((item) => item.id)).toEqual(["i"]);
    expect(filterJobsByQueueView(jobs, "all").map((item) => item.id)).toEqual(["r", "i", "a"]);
  });
});

describe("sortOpportunityJobs", () => {
  it("sorts by descending score with stable ties", () => {
    const jobs = [
      job({ id: "b", status: "reviewing", createdAt: EARLIER, jobMatch: {
        score: 80, decision: "apply", matchedSkills: [], missingSkills: [], evaluatedAt: NOW, scoringVersion: "v1",
      } }),
      job({ id: "a", status: "reviewing", createdAt: EARLIER, jobMatch: {
        score: 80, decision: "apply", matchedSkills: [], missingSkills: [], evaluatedAt: NOW, scoringVersion: "v1",
      } }),
      job({ id: "c", status: "reviewing", createdAt: NOW, jobMatch: {
        score: 90, decision: "apply", matchedSkills: [], missingSkills: [], evaluatedAt: NOW, scoringVersion: "v1",
      } }),
    ];
    expect(sortOpportunityJobs(jobs, "match").map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by recency", () => {
    const jobs = [
      job({ id: "old", status: "reviewing", createdAt: EARLIER }),
      job({ id: "new", status: "reviewing", createdAt: NOW }),
    ];
    expect(sortOpportunityJobs(jobs, "recency").map((item) => item.id)).toEqual(["new", "old"]);
  });
});

describe("selectOpportunityQueueJobs", () => {
  it("combines view, decision filter, source filter, and sort", () => {
    const jobs = [
      job({
        id: "jg",
        status: "reviewing",
        source: "jobgether",
        createdAt: EARLIER,
        jobMatch: {
          score: 60, decision: "stretch", matchedSkills: [], missingSkills: [], evaluatedAt: NOW, scoringVersion: "v1",
        },
      }),
      job({
        id: "ts",
        status: "reviewing",
        source: "theirstack",
        createdAt: NOW,
        jobMatch: {
          score: 90, decision: "apply", matchedSkills: [], missingSkills: [], evaluatedAt: NOW, scoringVersion: "v1",
        },
      }),
      job({
        id: "skip_kept",
        status: "reviewing",
        source: "remoteok",
        jobMatch: {
          score: 20, decision: "skip", matchedSkills: [], missingSkills: ["Java"], evaluatedAt: NOW, scoringVersion: "v1",
        },
      }),
      job({ id: "ignored", status: "ignored", source: "paste" }),
    ];
    expect(
      selectOpportunityQueueJobs(jobs, { view: "active", sort: "match" }).map((item) => item.id),
    ).toEqual(["ts", "jg", "skip_kept"]);
    expect(
      selectOpportunityQueueJobs(jobs, { view: "active", sort: "match", decision: "skip" }).map((item) => item.id),
    ).toEqual(["skip_kept"]);
    expect(
      selectOpportunityQueueJobs(jobs, { view: "active", sort: "recency", source: "theirstack" }).map((item) => item.id),
    ).toEqual(["ts"]);
  });
});

describe("ignoreApplyFlowJob / restoreApplyFlowJobToQueue", () => {
  it("ignores without deleting match evidence and restores without recomputing", () => {
    const reviewing = job({
      id: "x",
      status: "reviewing",
      jobMatch: {
        score: 12, decision: "skip", matchedSkills: [], missingSkills: ["Java"], evaluatedAt: NOW, scoringVersion: "v1",
      },
    });
    const later = new Date("2026-08-14T12:00:00.000Z");
    const ignored = ignoreApplyFlowJob(reviewing, later);
    expect(ignored.status).toBe("ignored");
    expect(ignored.jobMatch).toEqual(reviewing.jobMatch);
    expect(ignored.updatedAt).toBe(later.toISOString());

    const restored = restoreApplyFlowJobToQueue(ignored, later);
    expect(restored.status).toBe("reviewing");
    expect(restored.jobMatch.decision).toBe("skip");
    expect(restored.jobMatch.score).toBe(12);
  });
});
