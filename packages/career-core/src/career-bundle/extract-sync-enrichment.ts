import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import { parseCareerBundle } from "../bundle-helpers.js";
import { validateCareerBundleSyncEnrichment } from "./sync-enrichment.js";

function readSyncEnrichmentCandidate(input: object): unknown {
  if (!("syncEnrichment" in input)) {
    return undefined;
  }

  return (input as { syncEnrichment?: unknown }).syncEnrichment;
}

/**
 * Extracts validated sync enrichment from a CareerBundle-shaped value.
 * Returns null when the bundle or enrichment is missing or fails canonical validation.
 * Does not mutate input or return bundle metadata, candidate, or applications.
 */
export function extractCareerBundleSyncEnrichment(
  input: unknown,
): CareerBundleUnifiedSyncEnrichment | null {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const bundleParse = parseCareerBundle(input);
  if (!bundleParse.ok) {
    return null;
  }

  const syncCandidate = readSyncEnrichmentCandidate(input);
  if (syncCandidate == null) {
    return null;
  }

  const validation = validateCareerBundleSyncEnrichment(
    syncCandidate as CareerBundleUnifiedSyncEnrichment,
  );

  if (validation.status !== "provided" || !validation.syncEnrichment) {
    return null;
  }

  return validation.syncEnrichment;
}
