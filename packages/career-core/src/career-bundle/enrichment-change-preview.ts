import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import {
  deriveEnrichmentChangePreview,
  type DeriveEnrichmentChangePreviewInput,
  type EnrichmentChangePreviewResult,
} from "@devflow/career-sync";
import type { CareerBundle } from "../schemas/careerBundle.js";
import type { CareerBundleWithSyncEnrichment } from "./types.js";

export type DeriveCareerBundleEnrichmentChangePreviewInput = {
  bundle: CareerBundle | CareerBundleWithSyncEnrichment;
  proposed: CareerBundleUnifiedSyncEnrichment | null | undefined;
  excludedSignalIds?: readonly string[];
};

/**
 * Compares optional sync enrichment on a CareerBundle with a proposed enrichment.
 * Delegates field-level semantics to `@devflow/career-sync`.
 */
export function deriveCareerBundleEnrichmentChangePreview(
  input: DeriveCareerBundleEnrichmentChangePreviewInput,
): EnrichmentChangePreviewResult {
  const current =
    "syncEnrichment" in input.bundle ? (input.bundle.syncEnrichment ?? null) : null;

  const previewInput: DeriveEnrichmentChangePreviewInput = {
    current,
    proposed: input.proposed,
    excludedSignalIds: input.excludedSignalIds,
  };

  return deriveEnrichmentChangePreview(previewInput);
}
