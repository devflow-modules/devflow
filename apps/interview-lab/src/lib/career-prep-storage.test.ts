// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createInterviewPreparationFromApplication } from "@devflow/career-core";
import { appendCareerPrepRecord, loadCareerPrepById } from "@/lib/career-prep-storage";

describe("career-prep-storage", () => {
  beforeEach(() => {
    localStorage.removeItem("devflow:interview-lab:career-prep:v1");
  });

  it("stores and loads preparation by id", () => {
    const preparation = createInterviewPreparationFromApplication({
      id: "job-99",
      company: "Acme",
      role: "SRE",
      source: "linkedin",
      requiredSkills: ["Linux", "K8s"],
      status: "interview_scheduled",
    });
    const id = "prep-row-1";
    appendCareerPrepRecord({
      id,
      applicationId: "job-99",
      company: "Acme",
      role: "SRE",
      status: "interview_scheduled",
      requiredSkills: ["Linux", "K8s"],
      preparation,
      createdAt: "2026-01-01T12:00:00.000Z",
    });
    const row = loadCareerPrepById(id);
    expect(row).not.toBeNull();
    expect(row!.preparation.applicationId).toBe("job-99");
    expect(row!.preparation.technicalQuestions.length).toBeGreaterThan(0);
  });
});
