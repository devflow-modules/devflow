import { describe, expect, it } from "vitest";
import {
  handleCareerAgentOrchestration,
  parseCareerAgentOrchestrationRequest,
} from "./career-agent-orchestration-boundary.js";

describe("career-agent-orchestration-boundary", () => {
  it("parses valid orchestration request", () => {
    const parsed = parseCareerAgentOrchestrationRequest({
      intent: "analyze_application_fit",
      explicitConsent: true,
      context: {
        careerBundle: {
          schemaVersion: "1.0",
          exportedAt: "2026-06-16T12:00:00.000Z",
          sourceProduct: "applyflow",
          applications: [
            {
              id: "app-1",
              company: "Acme",
              role: "Backend Engineer",
              source: "linkedin",
              requiredSkills: ["TypeScript"],
              status: "applied",
            },
          ],
        },
        selectedSignalIds: [],
      },
    });

    expect(parsed.ok).toBe(true);
  });

  it("rejects unsafe payload values", () => {
    const parsed = parseCareerAgentOrchestrationRequest({
      intent: "analyze_application_fit",
      explicitConsent: true,
      context: {
        careerBundle: {
          schemaVersion: "1.0",
          exportedAt: "2026-06-16T12:00:00.000Z",
          sourceProduct: "applyflow",
          applications: [
            {
              id: "app-1",
              company: "Acme",
              role: "Backend Engineer",
              source: "linkedin",
              requiredSkills: ["TypeScript"],
              status: "applied",
              notes: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
            },
          ],
        },
        selectedSignalIds: [],
      },
    });

    expect(parsed.ok).toBe(false);
  });

  it("always returns review-required client-safe results", () => {
    const result = handleCareerAgentOrchestration(
      {
        intent: "analyze_profile_gaps",
        explicitConsent: true,
        context: {
          careerBundle: {
            schemaVersion: "1.0",
            exportedAt: "2026-06-16T12:00:00.000Z",
            sourceProduct: "applyflow",
            applications: [
              {
                id: "app-1",
                company: "Acme",
                role: "Backend Engineer",
                source: "linkedin",
                requiredSkills: ["TypeScript", "Go"],
                status: "applied",
              },
            ],
          },
          selectedSignalIds: [],
        },
      },
      "2026-06-16T12:00:00.000Z",
    );

    expect(result.reviewRequired).toBe(true);
    expect(result.safeForClient).toBe(true);
    expect(result.hasToken).toBe(false);
  });
});
