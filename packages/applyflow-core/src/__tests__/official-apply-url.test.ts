import { describe, expect, it } from "vitest";

import {
  OFFICIAL_APPLY_URL_MAX_CHARS,
  validateOfficialApplyUrl,
  withOfficialApplyUrl,
} from "../official-apply-url.js";
import type { ApplyFlowJob } from "../job-match-types.js";

function baseJob(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job-1",
    title: "Engineer",
    company: "Acme",
    location: "Remote",
    url: "https://remoteok.com/remote-jobs/1",
    source: "remoteok",
    status: "reviewing",
    description: "React TypeScript",
    jobContext: { skills: ["React"] },
    createdAt: "2026-08-18T15:00:00.000Z",
    updatedAt: "2026-08-18T15:00:00.000Z",
    ...overrides,
  };
}

describe("validateOfficialApplyUrl", () => {
  it("clears empty / whitespace / null", () => {
    expect(validateOfficialApplyUrl(null)).toEqual({ ok: true, value: undefined });
    expect(validateOfficialApplyUrl("")).toEqual({ ok: true, value: undefined });
    expect(validateOfficialApplyUrl("   ")).toEqual({ ok: true, value: undefined });
  });

  it("accepts absolute http(s) URLs and trims", () => {
    expect(validateOfficialApplyUrl("  https://jobs.ashbyhq.com/acme/x/apply  ")).toEqual({
      ok: true,
      value: "https://jobs.ashbyhq.com/acme/x/apply",
    });
  });

  it("rejects non-http(s), relative, and oversized URLs", () => {
    expect(validateOfficialApplyUrl("javascript:alert(1)")).toEqual({ ok: false, error: "invalid_url" });
    expect(validateOfficialApplyUrl("/jobs/local")).toEqual({ ok: false, error: "invalid_url" });
    expect(validateOfficialApplyUrl("ftp://example.com/job")).toEqual({ ok: false, error: "invalid_url" });
    expect(validateOfficialApplyUrl(`https://example.com/${"a".repeat(OFFICIAL_APPLY_URL_MAX_CHARS)}`)).toEqual({
      ok: false,
      error: "too_long",
    });
  });
});

describe("withOfficialApplyUrl", () => {
  const now = new Date("2026-08-18T16:00:00.000Z");

  it("sets officialApplyUrl without changing status", () => {
    const result = withOfficialApplyUrl(
      baseJob(),
      "https://jobs.lever.co/acme/role/apply",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.status).toBe("reviewing");
    expect(result.job.jobContext.officialApplyUrl).toBe("https://jobs.lever.co/acme/role/apply");
    expect(result.job.url).toBe("https://remoteok.com/remote-jobs/1");
    expect(result.job.updatedAt).toBe(now.toISOString());
  });

  it("removes officialApplyUrl when cleared", () => {
    const withUrl = withOfficialApplyUrl(baseJob(), "https://jobs.ashbyhq.com/acme/1/apply", now);
    expect(withUrl.ok).toBe(true);
    if (!withUrl.ok) return;
    const cleared = withOfficialApplyUrl(withUrl.job, null, now);
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.job.jobContext.officialApplyUrl).toBeUndefined();
    expect("officialApplyUrl" in cleared.job.jobContext).toBe(false);
  });

  it("rejects invalid URL and leaves job untouched", () => {
    const job = baseJob();
    const result = withOfficialApplyUrl(job, "not-a-url", now);
    expect(result).toEqual({ ok: false, error: "invalid_url" });
    expect(job.jobContext.officialApplyUrl).toBeUndefined();
  });
});
