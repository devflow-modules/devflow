import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "../../schemas/careerBundle.js";
import type { CareerAutomationExecuteBody } from "../schemas.js";
import type { CareerAutomationProviderConfig } from "../types.js";

export function createSampleCareerBundle(overrides: Partial<CareerBundle> = {}): CareerBundle {
  return {
    schemaVersion: "1.0",
    exportedAt: "2026-06-16T12:00:00.000Z",
    sourceProduct: "applyflow",
    candidate: {
      targetRole: "Backend Engineer",
      mainStack: ["TypeScript", "Node.js"],
    },
    applications: [
      {
        id: "app-1",
        company: "Acme",
        role: "Backend Engineer",
        source: "linkedin",
        requiredSkills: ["TypeScript", "Node.js", "PostgreSQL"],
        status: "interview_scheduled",
        matchScore: 82,
      },
    ],
    ...overrides,
  };
}

export function createSampleSignal(
  overrides: Partial<ProviderDerivedSignal> & Pick<ProviderDerivedSignal, "id">,
): ProviderDerivedSignal {
  return {
    source: "gmail",
    kind: "provider_email_activity",
    occurredAt: "2026-06-15T10:00:00.000Z",
    confidence: 0.8,
    confidenceLevel: "high",
    reason: "Metadata-only activity",
    reviewRequired: true,
    sourceCount: 1,
    ...overrides,
  };
}

export function createSampleAutomationBody(
  overrides: Partial<CareerAutomationExecuteBody> = {},
): CareerAutomationExecuteBody {
  return {
    kind: "prepare_application_review",
    explicitApproval: true,
    approvalScope: "single_execution",
    context: {
      careerBundle: createSampleCareerBundle(),
      selectedSignalIds: [],
    },
    ...overrides,
  };
}

export function createMockAutomationProviderConfig(
  overrides: Partial<CareerAutomationProviderConfig> = {},
): CareerAutomationProviderConfig {
  return {
    provider: "mock",
    timeoutMs: 10000,
    configured: true,
    ...overrides,
  };
}
