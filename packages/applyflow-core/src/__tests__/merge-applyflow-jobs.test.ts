import { describe, expect, it } from "vitest";

import { canonicalizeJobUrl, findJobByCanonicalUrl } from "../job-url-identity.js";
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

  it("não cria outro registro quando a URL canónica já existe, e não sobrescreve o existente", () => {
    const existing = [
      job({
        id: "job_keep",
        url: "https://jobs.example.com/acme/role",
        title: "Original title",
        descriptionHash: "aaaaaaaa",
      }),
    ];
    const r = mergeApplyFlowJobs(existing, [
      job({
        id: "job_new",
        url: "https://jobs.example.com/acme/role/",
        title: "Pasted again",
        descriptionHash: "bbbbbbbb",
      }),
    ]);
    expect(r.added).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.jobs).toHaveLength(1);
    expect(r.jobs[0]?.id).toBe("job_keep");
    expect(r.jobs[0]?.title).toBe("Original title");
    expect(r.jobs[0]?.descriptionHash).toBe("aaaaaaaa");
  });

  it("trata query string como identidade distinta e não apaga registros antigos sem URL", () => {
    const existing = [
      job({ id: "job_plain", url: "https://jobs.example.com/acme/role", descriptionHash: "aaaaaaaa" }),
      job({ id: "job_legacy", descriptionHash: "cccccccc" }),
    ];
    const r = mergeApplyFlowJobs(existing, [
      job({
        id: "job_query",
        url: "https://jobs.example.com/acme/role?src=ref",
        descriptionHash: "dddddddd",
      }),
    ]);
    expect(r.added).toBe(1);
    expect(r.jobs.map((item) => item.id)).toEqual(["job_plain", "job_legacy", "job_query"]);
    expect(canonicalizeJobUrl("https://jobs.example.com/acme/role/")).toBe("https://jobs.example.com/acme/role");
    expect(findJobByCanonicalUrl(existing, "https://jobs.example.com/acme/role/")?.id).toBe("job_plain");
  });
});
