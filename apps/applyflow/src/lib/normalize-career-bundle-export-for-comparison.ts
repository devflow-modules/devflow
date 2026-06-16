import type { CareerBundle, CareerBundleWithSyncEnrichment } from "@devflow/career-core";

/**
 * Normalizes a CareerBundle export shape for structural comparison in tests.
 * Strips volatile timestamps such as exportedAt.
 */
export function normalizeCareerBundleExportForComparison(
  bundle: CareerBundle | CareerBundleWithSyncEnrichment,
): Record<string, unknown> {
  const { exportedAt: _exportedAt, ...rest } = bundle;
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
}

export function careerBundleExportsStructurallyEqual(
  left: CareerBundle | CareerBundleWithSyncEnrichment,
  right: CareerBundle | CareerBundleWithSyncEnrichment,
): boolean {
  return (
    JSON.stringify(normalizeCareerBundleExportForComparison(left)) ===
    JSON.stringify(normalizeCareerBundleExportForComparison(right))
  );
}
