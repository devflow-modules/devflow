import { describe, expect, it } from "vitest";
import {
  buildPilotCareerBundleFromFields,
  hasPilotAnalysisInputs,
} from "./build-pilot-career-bundle";
import { EMPTY_SPECIALIST_FIELDS } from "./career-chat-workspace";
import { CAREER_PILOT_EXAMPLE_FIELDS } from "./career-pilot-content";

describe("buildPilotCareerBundleFromFields", () => {
  it("builds a session bundle from specialist fields without exposing contract names in UI", () => {
    const bundle = buildPilotCareerBundleFromFields(CAREER_PILOT_EXAMPLE_FIELDS);

    expect(bundle.applications).toHaveLength(1);
    expect(bundle.applications[0]?.role).toContain("Backend");
    expect(bundle.candidate?.mainStack).toContain("TypeScript");
  });
});

describe("hasPilotAnalysisInputs", () => {
  it("requires resume data for analyze_resume", () => {
    expect(hasPilotAnalysisInputs("analyze_resume", EMPTY_SPECIALIST_FIELDS)).toBe(false);
    expect(
      hasPilotAnalysisInputs("analyze_resume", {
        ...EMPTY_SPECIALIST_FIELDS,
        resumeSkills: "TypeScript",
      }),
    ).toBe(true);
  });

  it("requires job requirements for ATS comparison", () => {
    expect(
      hasPilotAnalysisInputs("analyze_ats_compatibility", {
        ...EMPTY_SPECIALIST_FIELDS,
        resumeSkills: "TypeScript",
      }),
    ).toBe(false);
    expect(hasPilotAnalysisInputs("analyze_ats_compatibility", CAREER_PILOT_EXAMPLE_FIELDS)).toBe(
      true,
    );
  });

  it("requires target roles for career strategy", () => {
    expect(hasPilotAnalysisInputs("plan_career_strategy", EMPTY_SPECIALIST_FIELDS)).toBe(false);
    expect(
      hasPilotAnalysisInputs("plan_career_strategy", {
        ...EMPTY_SPECIALIST_FIELDS,
        targetRoles: "Backend Engineer",
      }),
    ).toBe(true);
  });
});
