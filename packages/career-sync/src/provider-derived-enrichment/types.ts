import type { ProviderDerivedSandboxCompositionResult } from "../provider-derived-signals/types.js";
import type { CareerBundleUnifiedSyncEnrichment } from "../career-bundle/types.js";

export type ProviderDerivedEnrichmentAdapterInput = {
  composition: ProviderDerivedSandboxCompositionResult;
  generatedAt: string;
};

export type ProviderDerivedEnrichmentAdapterResult = {
  status: "completed" | "blocked" | "error";
  runtime: "sandbox";
  safeForClient: true;
  deterministic: true;
  userReviewRequired: true;
  sourceSignalCount: number;
  enrichment?: CareerBundleUnifiedSyncEnrichment;
  warnings: string[];
  messages: string[];
};
