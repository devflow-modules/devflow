import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "../schemas/careerBundle.js";
import type { CareerAgentOrchestrationBody } from "./schemas.js";
import type { CareerAgentIntent, CareerAgentRequest } from "./types.js";

function stableSort(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function deriveCareerAgentRequestId(input: {
  intent: CareerAgentIntent;
  careerBundle: CareerBundle;
  selectedSignalIds: readonly string[];
}): string {
  const applicationIds = stableSort(input.careerBundle.applications.map((app) => app.id));
  const signalIds = stableSort(input.selectedSignalIds);

  return [
    "career-agent",
    input.intent,
    input.careerBundle.exportedAt,
    applicationIds.join(","),
    signalIds.join(","),
  ].join("::");
}

export function buildCareerAgentRequest(
  body: CareerAgentOrchestrationBody,
): CareerAgentRequest {
  const requestId = deriveCareerAgentRequestId({
    intent: body.intent,
    careerBundle: body.context.careerBundle,
    selectedSignalIds: body.context.selectedSignalIds,
  });

  return {
    requestId,
    intent: body.intent,
    explicitConsent: true,
    requestedAgent: body.requestedAgent,
    context: {
      careerBundle: body.context.careerBundle,
      selectedSignalIds: stableSort(body.context.selectedSignalIds),
      availableSignals: body.context.availableSignals as ProviderDerivedSignal[] | undefined,
    },
  };
}
