import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type { CareerBundle } from "../schemas/careerBundle.js";
import { createCareerBundleWithSyncEnrichment } from "./sync-export.js";
import type { CareerBundleWithSyncEnrichment } from "./types.js";

/**
 * Composes a transient CareerBundle export shape with validated sync enrichment.
 * Does not mutate the base bundle, applications, candidate, or enrichment input.
 */
export function composeCareerBundleExportWithSyncEnrichment(
  base: CareerBundle,
  syncEnrichment: CareerBundleUnifiedSyncEnrichment,
): CareerBundleWithSyncEnrichment {
  return createCareerBundleWithSyncEnrichment(base.applications, {
    syncEnrichment,
    exportedAt: base.exportedAt,
  });
}
