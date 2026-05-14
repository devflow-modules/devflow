import { describe, expect, it } from "vitest";
import type { ApplyFlowApplication } from "@devflow/applyflow-core";
import { parseCareerBundle } from "@devflow/career-core";
import {
  buildInterviewLabCareerBundle,
  buildSingleRowCareerBundleForInterviewLab,
  mapApplyFlowApplicationToCareer,
  selectApplicationsForInterviewLabBundle,
} from "./career-bundle-export.js";

const af = (over: Partial<ApplyFlowApplication>): ApplyFlowApplication => ({
  id: "1",
  createdAt: "2025-01-01T10:00:00.000Z",
  updatedAt: "2025-01-02T10:00:00.000Z",
  source: "linkedin",
  jobTitle: "Dev",
  companyName: "Co",
  status: "applied",
  ...over,
});

describe("mapApplyFlowApplicationToCareer", () => {
  it("maps linkedin source and interview pipeline statuses", () => {
    const c = mapApplyFlowApplicationToCareer(af({ status: "waiting_response" }));
    expect(c.source).toBe("linkedin");
    expect(c.status).toBe("interview_requested");
    const c2 = mapApplyFlowApplicationToCareer(af({ status: "interview" }));
    expect(c2.status).toBe("interview_scheduled");
  });

  it("carries detected skills and fit score", () => {
    const c = mapApplyFlowApplicationToCareer(
      af({
        fitScore: 7,
        jobMeta: { detectedSkills: ["React"], workModel: "remote", seniority: "senior" },
      }),
    );
    expect(c.requiredSkills).toEqual(["React"]);
    expect(c.remote).toBe(true);
    expect(c.seniority).toBe("senior");
    expect(c.matchScore).toBe(7);
  });
});

describe("selectApplicationsForInterviewLabBundle", () => {
  it("prefers interview-ready mapped rows", () => {
    const mapped = [
      mapApplyFlowApplicationToCareer(af({ id: "a", status: "applied" })),
      mapApplyFlowApplicationToCareer(af({ id: "b", status: "interview" })),
    ];
    const sel = selectApplicationsForInterviewLabBundle(mapped);
    expect(sel).toHaveLength(1);
    expect(sel[0]!.id).toBe("b");
  });

  it("falls back to applied/saved when no interview rows", () => {
    const mapped = [
      mapApplyFlowApplicationToCareer(af({ id: "x", status: "reviewing" })),
      mapApplyFlowApplicationToCareer(af({ id: "y", status: "applied" })),
    ];
    const sel = selectApplicationsForInterviewLabBundle(mapped);
    expect(sel.map((s) => s.id).sort()).toEqual(["x", "y"]);
  });
});

describe("buildInterviewLabCareerBundle", () => {
  it("produces JSON that parseCareerBundle accepts", () => {
    const bundle = buildInterviewLabCareerBundle([af({ id: "z" })]);
    const r = parseCareerBundle(bundle);
    expect(r.ok).toBe(true);
  });
});

describe("buildSingleRowCareerBundleForInterviewLab", () => {
  it("contains only the selected application id", () => {
    const app = af({ id: "only-one", jobTitle: "SRE" });
    const bundle = buildSingleRowCareerBundleForInterviewLab(app);
    const r = parseCareerBundle(bundle);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.applications).toHaveLength(1);
      expect(r.data.applications[0]!.id).toBe("only-one");
      expect(r.data.applications[0]!.role).toContain("SRE");
    }
  });
});
