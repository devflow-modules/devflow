import { describe, expect, it } from "vitest";

import type { Evidence } from "../evidence-types.js";
import { matchRequirementsToEvidence } from "../evidence-matching.js";
import type { JobRequirement } from "../job-requirement-types.js";

const stamp = "2026-09-09T12:00:00.000Z";

function evidence(partial: Pick<Evidence, "id" | "label" | "description"> & Partial<Evidence>): Evidence {
  return {
    subject: "skill",
    source: "resume",
    confidence: "partial",
    usableForClaims: true,
    createdAt: stamp,
    updatedAt: stamp,
    ...partial,
  };
}

function req(partial: Pick<JobRequirement, "id" | "label"> & Partial<JobRequirement>): JobRequirement {
  return {
    category: "backend",
    importance: "important",
    requirementType: "skill",
    ...partial,
  };
}

describe("matchRequirementsToEvidence", () => {
  it("não trata Python automation como Senior Python Backend", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "py", label: "Senior Python backend", skillHint: "Python", qualifiers: ["backend", "senior"], minYears: 5 })],
      [evidence({ id: "e1", label: "Python automation / scripting", description: "RPA and operational scripts", technologies: ["Python"] })],
    );
    expect(match?.status).toBe("partial");
  });

  it("não trata Docker como AWS", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "aws", label: "AWS", category: "cloud", skillHint: "AWS" })],
      [evidence({ id: "e1", label: "Docker", description: "Container workflows", technologies: ["Docker"] })],
    );
    expect(match?.status).toBe("unknown");
  });

  it("não trata REST API como distributed microservices", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "ms", label: "Distributed microservices", qualifiers: ["distributed", "microservices"] })],
      [evidence({ id: "e1", label: "REST API", description: "REST API integrations", technologies: ["REST"] })],
    );
    expect(match?.status).toBe("partial");
  });

  it("não trata PostgreSQL como vector database", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "vec", label: "Vector database", category: "ai", qualifiers: ["vector"] })],
      [evidence({ id: "e1", label: "PostgreSQL", description: "Relational PostgreSQL", technologies: ["PostgreSQL"] })],
    );
    expect(match?.status).toBe("partial");
  });

  it("não trata GitHub Actions como 3 years AWS architecture", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "aws", label: "AWS architecture (3+ years)", category: "cloud", skillHint: "AWS", qualifiers: ["architecture"], minYears: 3, requirementType: "years" })],
      [evidence({ id: "e1", label: "GitHub Actions", description: "CI/CD with GitHub Actions", technologies: ["CI/CD"] })],
    );
    expect(match?.status).toBe("unknown");
  });

  it("favorece UNKNOWN quando não há evidência", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "k", label: "Kafka", skillHint: "Kafka" })],
      [evidence({ id: "e1", label: "React", description: "Frontend React", technologies: ["React"] })],
    );
    expect(match?.status).toBe("unknown");
  });
});
