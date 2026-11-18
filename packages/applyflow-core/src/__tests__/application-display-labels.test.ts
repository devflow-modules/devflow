import { describe, expect, it } from "vitest";

import {
  APPLICATION_COMPANY_MISSING,
  APPLICATION_JOB_TITLE_MISSING,
  resolveApplicationCompanyName,
  resolveApplicationJobTitle,
} from "../application-display-labels.js";
import type { ApplyFlowApplicationV2Envelope } from "../application-record-v2.js";
import type { ApplyFlowJob } from "../job-match-types.js";

const NOW = "2026-11-17T15:00:00.000Z";

function job(overrides: Partial<ApplyFlowJob> & Pick<ApplyFlowJob, "id">): ApplyFlowJob {
  return {
    id: overrides.id,
    title: overrides.title ?? "Product Engineer",
    company: overrides.company ?? "Acme",
    url: overrides.url ?? `https://example.com/jobs/${overrides.id}`,
    source: overrides.source ?? "paste",
    status: overrides.status ?? "applied",
    jobContext: overrides.jobContext ?? { skills: ["TypeScript"] },
    jobMatch: overrides.jobMatch ?? {
      score: 70,
      decision: "apply",
      matchedSkills: ["TypeScript"],
      missingSkills: [],
      evaluatedAt: NOW,
      scoringVersion: "v1",
    },
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  };
}

function app(
  overrides: Partial<ApplyFlowApplicationV2Envelope> & Pick<ApplyFlowApplicationV2Envelope, "id">,
): ApplyFlowApplicationV2Envelope {
  return {
    id: overrides.id,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    source: overrides.source ?? "paste",
    status: overrides.status ?? "applied",
    jobTitle: overrides.jobTitle,
    companyName: overrides.companyName,
    v2: overrides.v2,
  };
}

describe("resolveApplicationJobTitle / resolveApplicationCompanyName", () => {
  it("prefers Application fields over the linked job", () => {
    const linked = job({ id: "job_1", title: "From Job", company: "Job Co" });
    const application = app({
      id: "app_1",
      jobTitle: "From Application",
      companyName: "App Co",
      v2: { sourceJobId: "job_1" },
    });
    expect(resolveApplicationJobTitle(application, linked)).toBe("From Application");
    expect(resolveApplicationCompanyName(application, linked)).toBe("App Co");
  });

  it("falls back to the unambiguously linked job when Application fields are missing", () => {
    const linked = job({ id: "job_partial", title: "Backend Engineer", company: "Persisted Co" });
    const incomplete = app({
      id: "app_partial",
      // Incomplete fixture historically used role/company instead of jobTitle/companyName.
      v2: { sourceJobId: "job_partial" },
    });
    expect(resolveApplicationJobTitle(incomplete, linked)).toBe("Backend Engineer");
    expect(resolveApplicationCompanyName(incomplete, linked)).toBe("Persisted Co");
  });

  it("does not use an unrelated job when sourceJobId does not match", () => {
    const other = job({ id: "job_other", title: "Other Role", company: "Other Co" });
    const orphan = app({ id: "app_orphan", v2: { sourceJobId: "job_missing" } });
    expect(resolveApplicationJobTitle(orphan, other)).toBe(APPLICATION_JOB_TITLE_MISSING);
    expect(resolveApplicationCompanyName(orphan, other)).toBe(APPLICATION_COMPANY_MISSING);
  });

  it("uses a clear absence label when no Application field and no reliable job link", () => {
    const standalone = app({ id: "app_solo" });
    expect(resolveApplicationJobTitle(standalone, null)).toBe(APPLICATION_JOB_TITLE_MISSING);
    expect(resolveApplicationCompanyName(standalone, undefined)).toBe(APPLICATION_COMPANY_MISSING);
  });

  it("treats blank Application strings as missing", () => {
    const linked = job({ id: "job_blank", title: "Filled Title", company: "Filled Co" });
    const blank = app({
      id: "app_blank",
      jobTitle: "   ",
      companyName: "",
      v2: { sourceJobId: "job_blank" },
    });
    expect(resolveApplicationJobTitle(blank, linked)).toBe("Filled Title");
    expect(resolveApplicationCompanyName(blank, linked)).toBe("Filled Co");
  });
});
