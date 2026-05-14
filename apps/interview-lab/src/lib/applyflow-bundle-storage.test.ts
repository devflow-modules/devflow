// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createCareerBundle } from "@devflow/career-core";
import { clearApplyFlowCareerBundle, loadApplyFlowCareerBundle, persistApplyFlowCareerBundle } from "@/lib/applyflow-bundle-storage";

describe("applyflow-bundle-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    clearApplyFlowCareerBundle();
  });

  it("round-trips a valid CareerBundle", () => {
    const bundle = createCareerBundle(
      [
        {
          id: "app-1",
          company: "Co",
          role: "Engineer",
          source: "linkedin",
          requiredSkills: ["TS"],
          status: "applied",
        },
      ],
      { name: "Alex" },
    );
    persistApplyFlowCareerBundle(bundle);
    const loaded = loadApplyFlowCareerBundle();
    expect(loaded).not.toBeNull();
    expect(loaded!.applications).toHaveLength(1);
    expect(loaded!.applications[0]!.id).toBe("app-1");
    expect(loaded!.candidate?.name).toBe("Alex");
  });

  it("returns null for invalid stored JSON", () => {
    localStorage.setItem("devflow:interview-lab:applyflow-career-bundle:v1", "{not json");
    expect(loadApplyFlowCareerBundle()).toBeNull();
  });

  it("returns null when bundle fails schema", () => {
    localStorage.setItem("devflow:interview-lab:applyflow-career-bundle:v1", JSON.stringify({ foo: 1 }));
    expect(loadApplyFlowCareerBundle()).toBeNull();
  });
});
