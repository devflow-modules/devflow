import type { ApplyFlowApplication } from "@devflow/applyflow-core";
import { extractCareerBundleSyncEnrichment } from "@devflow/career-core";
import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import { buildInterviewLabCareerBundleForExport } from "./career-bundle-export";

export type DeriveDashboardCareerBundleSyncEnrichmentBaselineInput = {
  applications: readonly ApplyFlowApplication[];
  includeDemoSyncEnrichment: boolean;
};

/**
 * Derives the optional current sync enrichment baseline from the dashboard's
 * in-memory applications export shape. Returns null when no valid baseline exists.
 */
export function deriveDashboardCareerBundleSyncEnrichmentBaseline(
  input: DeriveDashboardCareerBundleSyncEnrichmentBaselineInput,
): CareerBundleUnifiedSyncEnrichment | null {
  if (input.applications.length === 0) {
    return null;
  }

  const bundle = buildInterviewLabCareerBundleForExport([...input.applications], {
    includeDemoSyncEnrichment: input.includeDemoSyncEnrichment,
  });

  return extractCareerBundleSyncEnrichment(bundle);
}
