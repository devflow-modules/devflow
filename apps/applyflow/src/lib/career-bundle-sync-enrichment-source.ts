import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";

export type CareerBundleSyncEnrichmentSourceKind = "none" | "demo" | "provider-derived-proposal";

export type CareerBundleSyncEnrichmentSource =
  | { kind: "none" }
  | { kind: "demo" }
  | {
      kind: "provider-derived-proposal";
      enrichment: CareerBundleUnifiedSyncEnrichment;
    };

export type ResolveCareerBundleSyncEnrichmentSourceInput = {
  includeDemoSyncEnrichment: boolean;
  eligibleProviderEnrichment: CareerBundleUnifiedSyncEnrichment | null;
};

/**
 * Resolves a mutually exclusive sync enrichment source for transient export composition.
 * Provider-derived proposal enrichment takes precedence over demo when eligible.
 */
export function resolveCareerBundleSyncEnrichmentSource(
  input: ResolveCareerBundleSyncEnrichmentSourceInput,
): CareerBundleSyncEnrichmentSource {
  if (input.eligibleProviderEnrichment != null) {
    return {
      kind: "provider-derived-proposal",
      enrichment: input.eligibleProviderEnrichment,
    };
  }

  if (input.includeDemoSyncEnrichment) {
    return { kind: "demo" };
  }

  return { kind: "none" };
}

export function careerBundleSyncEnrichmentSourceKind(
  source: CareerBundleSyncEnrichmentSource,
): CareerBundleSyncEnrichmentSourceKind {
  return source.kind;
}
