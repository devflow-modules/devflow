import { gustavoProfile, mergeApplyFlowJobs } from "@devflow/applyflow-core";
import { describe, expect, it } from "vitest";

import {
  applyFlowJobIdFromExternalId,
  hasAnalyzableJobDescription,
  ingestDiscoveredJobHit,
  withHitDescription,
} from "./save-hit";
import type { JobSearchHit } from "./types";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const description = "Senior full stack engineer. React, Next.js, TypeScript, Node.js and PostgreSQL. Remote.";

function hit(overrides: Partial<JobSearchHit> = {}): JobSearchHit {
  return {
    externalId: "65f1a2b3c4d5e6f7a8b9c0d1",
    source: "jobgether",
    title: "Senior Full Stack Engineer",
    company: "Acme",
    description,
    location: "Brazil",
    sourceUrl: "https://jobgether.com/offer/65f1a2b3c4d5e6f7a8b9c0d1-senior-full-stack",
    ...overrides,
  };
}

describe("save discovered Jobgether hit", () => {
  it("builds a deterministic job_jg_ id and preserves listing url and source", () => {
    expect(applyFlowJobIdFromExternalId("65f1a2b3c4d5e6f7a8b9c0d1")).toBe("job_jg_65f1a2b3c4d5e6f7a8b9c0d1");
    const saved = ingestDiscoveredJobHit(hit(), { profile: gustavoProfile, now: NOW });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.job.id).toBe("job_jg_65f1a2b3c4d5e6f7a8b9c0d1");
    expect(saved.job.source).toBe("jobgether");
    expect(saved.job.url).toBe(hit().sourceUrl);
    expect(saved.job.title).toBe("Senior Full Stack Engineer");
    expect(saved.job.jobMatch.scoringVersion).toBe("v1");
    expect(Object.keys(saved).sort()).toEqual(["job", "ok"]);
  });

  it("accepts a user-supplied description on a hit that lacked one", () => {
    const completed = withHitDescription(hit({ description: undefined }), description);
    expect(completed).not.toBeNull();
    if (!completed) return;
    const saved = ingestDiscoveredJobHit(completed, { profile: gustavoProfile, now: NOW });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.job.id).toBe("job_jg_65f1a2b3c4d5e6f7a8b9c0d1");
    expect(saved.job.source).toBe("jobgether");
    expect(saved.job.url).toBe(hit().sourceUrl);
    expect(saved.job.company).toBe("Acme");
    expect(saved.job.descriptionSnapshot).toContain("React");
    expect(saved.job.jobMatch.matchedSkills.length + saved.job.jobMatch.missingSkills.length).toBeGreaterThan(0);
  });

  it("refuses a hit without description and does not invent one", () => {
    expect(hasAnalyzableJobDescription(undefined)).toBe(false);
    expect(hasAnalyzableJobDescription("   ")).toBe(false);
    expect(withHitDescription(hit({ description: undefined }), "   ")).toBeNull();
    const saved = ingestDiscoveredJobHit(hit({ description: undefined }), { profile: gustavoProfile, now: NOW });
    expect(saved).toEqual({ ok: false, reason: "missing_description" });
  });

  it("does not create an application when ingesting a discovered hit", () => {
    const saved = ingestDiscoveredJobHit(hit(), { profile: gustavoProfile, now: NOW });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved).toEqual({ ok: true, job: saved.job });
    expect(JSON.stringify(saved)).not.toContain('"application"');
  });

  it("ignores a duplicate deterministic id", () => {
    const first = ingestDiscoveredJobHit(hit(), { profile: gustavoProfile, now: NOW });
    const second = ingestDiscoveredJobHit(
      hit({
        description: "A different description that should not replace the saved job.",
        sourceUrl: "https://jobgether.com/offer/other",
      }),
      { profile: gustavoProfile, now: NOW },
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const merged = mergeApplyFlowJobs([first.job], [second.job]);
    expect(merged.added).toBe(0);
    expect(merged.skipped).toBe(1);
    expect(merged.jobs).toHaveLength(1);
    expect(merged.jobs[0]?.url).toBe(first.job.url);
  });

  it("ignores a duplicate canonical listing url", () => {
    const first = ingestDiscoveredJobHit(hit(), { profile: gustavoProfile, now: NOW });
    const second = ingestDiscoveredJobHit(
      hit({
        externalId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        description: "Different body so the description hash does not match.",
        sourceUrl: "https://jobgether.com/offer/65f1a2b3c4d5e6f7a8b9c0d1-senior-full-stack/",
      }),
      { profile: gustavoProfile, now: NOW },
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const merged = mergeApplyFlowJobs([first.job], [second.job]);
    expect(merged.added).toBe(0);
    expect(merged.skipped).toBe(1);
  });

  it("ignores a duplicate description hash", () => {
    const first = ingestDiscoveredJobHit(hit(), { profile: gustavoProfile, now: NOW });
    const second = ingestDiscoveredJobHit(
      hit({
        externalId: "bbbbbbbbbbbbbbbbbbbbbbbb",
        sourceUrl: "https://jobgether.com/offer/another-listing",
      }),
      { profile: gustavoProfile, now: NOW },
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.job.descriptionHash).toBe(second.job.descriptionHash);
    const merged = mergeApplyFlowJobs([first.job], [second.job]);
    expect(merged.added).toBe(0);
    expect(merged.skipped).toBe(1);
  });
});
