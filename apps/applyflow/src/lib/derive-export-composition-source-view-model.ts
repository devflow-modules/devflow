import type { CareerBundleSyncEnrichmentSourceKind } from "./career-bundle-sync-enrichment-source";
import {
  DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS,
  DASHBOARD_CAREER_EXPORT_SOURCE_LABELS,
} from "@/components/dashboard/dashboard-career-export-content";

export type ExportCompositionSourceViewModel = {
  kind: CareerBundleSyncEnrichmentSourceKind;
  label: string;
  description: string;
  hasEnrichment: boolean;
  isProviderDerived: boolean;
  isDemo: boolean;
};

function safeSourceKind(
  input: CareerBundleSyncEnrichmentSourceKind | string | null | undefined,
): CareerBundleSyncEnrichmentSourceKind {
  if (input === "demo" || input === "provider-derived-proposal" || input === "none") {
    return input;
  }

  return "none";
}

/**
 * Derives a client-safe view model for export composition source visibility.
 * Accepts only sourceKind — no proposal, bundle, or provider data.
 */
export function deriveExportCompositionSourceViewModel(
  sourceKind: CareerBundleSyncEnrichmentSourceKind,
): ExportCompositionSourceViewModel {
  const kind = safeSourceKind(sourceKind);

  return {
    kind,
    label: DASHBOARD_CAREER_EXPORT_SOURCE_LABELS[kind],
    description: DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS[kind],
    hasEnrichment: kind !== "none",
    isProviderDerived: kind === "provider-derived-proposal",
    isDemo: kind === "demo",
  };
}
