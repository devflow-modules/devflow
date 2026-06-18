import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerAgentContext, CareerAgentRequest } from "./types.js";

function resolveSelectedSignals(input: {
  selectedSignalIds: readonly string[];
  availableSignals?: readonly ProviderDerivedSignal[];
}): ProviderDerivedSignal[] {
  if (!input.availableSignals?.length) {
    return [];
  }

  const byId = new Map(input.availableSignals.map((signal) => [signal.id, signal]));
  return input.selectedSignalIds
    .map((id) => byId.get(id))
    .filter((signal): signal is ProviderDerivedSignal => signal != null);
}

export function buildCareerAgentContext(request: CareerAgentRequest): CareerAgentContext {
  return {
    requestId: request.requestId,
    intent: request.intent,
    explicitConsent: true,
    careerBundle: request.context.careerBundle,
    selectedSignalIds: [...request.context.selectedSignalIds],
    selectedSignals: resolveSelectedSignals({
      selectedSignalIds: request.context.selectedSignalIds,
      availableSignals: request.context.availableSignals,
    }),
    analysisInput: request.context.analysisInput ?? {},
    sanitized: true,
    rawProviderData: false,
    hasToken: false,
  };
}
