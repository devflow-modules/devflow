import { describe, expect, it } from "vitest";

import { mergeApplyFlowJobs } from "../merge-applyflow-jobs.js";
import type { ApplyFlowJob } from "../job-match-types.js";

function job(partial: Pick<ApplyFlowJob, "id"> & Partial<ApplyFlowJob>): ApplyFlowJob {
  return {
    title: "Role",
    source: "paste",
    status: "reviewing",
    jobContext: { skills: [] },
    jobMatch: {
      score: 80,
      decision: "apply",
      matchedSkills: [],
      missingSkills: [],
      evaluatedAt: "2026-08-13T12:00:00.000Z",
      scoringVersion: "v1",
    },
    createdAt: "2026-08-13T12:00:00.000Z",
    updatedAt: "2026-08-13T12:00:00.000Z",
    ...partial,
  };
}

describe("mergeApplyFlowJobs", () => {
  it("salta ids e hashes repetidos", () => {
    const existing = [job({ id: "a", descriptionHash: "aaaaaaaa" })];
    const r = mergeApplyFlowJobs(existing, [
      job({ id: "a", descriptionHash: "bbbbbbbb" }),
      job({ id: "b", descriptionHash: "aaaaaaaa" }),
      job({ id: "c", descriptionHash: "cccccccc" }),
    ]);
    expect(r.added).toBe(1);
    expect(r.skipped).toBe(2);
    expect(r.jobs.map((item) => item.id)).toEqual(["a", "c"]);
  });
});
