import { describe, expect, it } from "vitest";
import {
  createCareerBundle,
  createInterviewPreparationFromApplication,
  getInterviewReadyApplications,
  parseCareerBundle,
} from "../bundle-helpers.js";
import type { CareerApplication } from "../schemas/careerApplication.js";

const baseApp = (over: Partial<CareerApplication>): CareerApplication => ({
  id: "a1",
  company: "Acme",
  role: "Backend Engineer",
  source: "linkedin",
  requiredSkills: ["Zod", "Node"],
  status: "applied",
  ...over,
});

describe("parseCareerBundle", () => {
  it("rejects invalid input", () => {
    const r = parseCareerBundle({ foo: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });

  it("accepts a valid bundle", () => {
    const bundle = createCareerBundle([baseApp({ id: "x" })], { name: "Dev" });
    const r = parseCareerBundle(bundle);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.schemaVersion).toBe("1.0");
      expect(r.data.sourceProduct).toBe("applyflow");
      expect(r.data.applications).toHaveLength(1);
      expect(r.data.candidate?.name).toBe("Dev");
    }
  });
});

describe("getInterviewReadyApplications", () => {
  it("returns only interview statuses, interview_requested first", () => {
    const bundle = createCareerBundle([
      baseApp({ id: "z", status: "interview_scheduled" }),
      baseApp({ id: "y", status: "interview_requested" }),
      baseApp({ id: "w", status: "applied" }),
    ]);
    const ready = getInterviewReadyApplications(bundle);
    expect(ready.map((a) => a.id)).toEqual(["y", "z"]);
  });
});

describe("createInterviewPreparationFromApplication", () => {
  it("is deterministic for the same application", () => {
    const app = baseApp({
      id: "id-1",
      requiredSkills: ["b", "a"],
      jobDescription: "Need strong TypeScript",
    });
    const a = createInterviewPreparationFromApplication(app);
    const b = createInterviewPreparationFromApplication(app);
    expect(a).toEqual(b);
    expect(a.applicationId).toBe("id-1");
    expect(a.estimatedSessionMinutes).toBeGreaterThan(0);
    expect(a.focusAreas.length).toBeGreaterThan(0);
    expect(a.technicalQuestions.length).toBeGreaterThanOrEqual(3);
  });

  it("sorts skills lexicographically in output hints", () => {
    const app = baseApp({
      id: "s2",
      requiredSkills: ["zebra", "alpha"],
    });
    const prep = createInterviewPreparationFromApplication(app);
    expect(prep.liveCodingHints[0]).toContain("alpha");
  });
});
