import { describe, expect, it } from "vitest";
import { parseCareerToolInvokeRequest } from "./career-tool-invoke-boundary.js";

import { deriveCareerAgentRequestId } from "@devflow/career-core";

describe("career-tool-invoke-boundary", () => {
  it("parses valid invoke request", () => {
    const orchestration = {
      intent: "analyze_application_fit" as const,
      explicitConsent: true as const,
      context: {
        careerBundle: {
          schemaVersion: "1.0" as const,
          exportedAt: "2026-06-16T12:00:00.000Z",
          sourceProduct: "applyflow" as const,
          applications: [
            {
              id: "app-1",
              company: "Acme",
              role: "Backend Engineer",
              source: "linkedin" as const,
              requiredSkills: ["TypeScript"],
              status: "applied" as const,
            },
          ],
        },
        selectedSignalIds: ["signal-1"],
        availableSignals: [
          {
            id: "signal-1",
            source: "gmail" as const,
            kind: "provider_email_activity" as const,
            occurredAt: "2026-06-15T10:00:00.000Z",
            confidence: 0.8,
            reviewRequired: true as const,
            sourceCount: 1,
          },
        ],
      },
    };

    const agentRequestId = deriveCareerAgentRequestId({
      intent: orchestration.intent,
      careerBundle: orchestration.context.careerBundle,
      selectedSignalIds: orchestration.context.selectedSignalIds,
    });

    const parsed = parseCareerToolInvokeRequest({
      agentRequestId,
      toolName: "career.derive_fit_summary",
      input: { applicationId: "app-1" },
      explicitApproval: true,
      orchestration,
    });

    expect(parsed.ok).toBe(true);
  });
});
