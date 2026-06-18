import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "../../schemas/careerBundle.js";
import type { CareerLlmGenerateBody } from "../schemas.js";
import type { CareerLlmProviderConfig } from "../types.js";

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
      {
        id: "app-2",
        company: "Beta Labs",
        role: "Platform Engineer",
        source: "linkedin",
        requiredSkills: ["Go", "Kubernetes"],
        status: "applied",
        matchScore: 55,
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

export function createSampleLlmGenerateBody(
  overrides: Partial<CareerLlmGenerateBody> = {},
): CareerLlmGenerateBody {
  const signal = createSampleSignal({ id: "signal-1" });

  return {
    agentRequestId: "career-llm-local-1",
    explicitConsent: true,
    chatRequest: {
      action: "analyze_application_fit",
      message: "Focus on backend architecture and data reliability.",
    },
    context: {
      careerBundle: createSampleCareerBundle(),
      selectedSignalIds: [signal.id],
      availableSignals: [signal],
    },
    ...overrides,
  };
}

export function createMockProviderConfig(
  overrides: Partial<CareerLlmProviderConfig> = {},
): CareerLlmProviderConfig {
  return {
    provider: "mock",
    modelAlias: "career-mock-1",
    temperature: 0,
    maxOutputTokens: 1024,
    timeoutMs: 10000,
    configured: true,
    ...overrides,
  };
}
