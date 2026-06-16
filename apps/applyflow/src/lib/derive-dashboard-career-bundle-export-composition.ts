import type { ApplyFlowApplication } from "@devflow/applyflow-core";
import { extractCareerBundleSyncEnrichment } from "@devflow/career-core";
import type { CareerBundle, CareerBundleWithSyncEnrichment } from "@devflow/career-core";
import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import {
  buildInterviewLabCareerBundleForExport,
  type CareerBundleSyncEnrichmentSource,
} from "./career-bundle-export";
import {
  careerBundleSyncEnrichmentSourceKind,
  resolveCareerBundleSyncEnrichmentSource,
  type CareerBundleSyncEnrichmentSourceKind,
} from "./career-bundle-sync-enrichment-source";

export type DeriveDashboardCareerBundleExportCompositionInput = {
  applications: readonly ApplyFlowApplication[];
  includeDemoSyncEnrichment: boolean;
  eligibleProviderEnrichment: CareerBundleUnifiedSyncEnrichment | null;
};

export type DashboardCareerBundleExportComposition = {
  source: CareerBundleSyncEnrichmentSource;
  sourceKind: CareerBundleSyncEnrichmentSourceKind;
  syncEnrichment: CareerBundleUnifiedSyncEnrichment | null;
  bundle: CareerBundle | CareerBundleWithSyncEnrichment | null;
};

/**
 * Single policy for transient CareerBundle export preview and change-preview baseline.
 */
export function deriveDashboardCareerBundleExportComposition(
  input: DeriveDashboardCareerBundleExportCompositionInput,
): DashboardCareerBundleExportComposition {
  if (input.applications.length === 0) {
    return {
      source: { kind: "none" },
      sourceKind: "none",
      syncEnrichment: null,
      bundle: null,
    };
  }

  const source = resolveCareerBundleSyncEnrichmentSource({
    includeDemoSyncEnrichment: input.includeDemoSyncEnrichment,
    eligibleProviderEnrichment: input.eligibleProviderEnrichment,
  });

  const bundle = buildInterviewLabCareerBundleForExport([...input.applications], {
    syncEnrichmentSource: source,
  });

  return {
    source,
    sourceKind: careerBundleSyncEnrichmentSourceKind(source),
    syncEnrichment: extractCareerBundleSyncEnrichment(bundle),
    bundle,
  };
}
