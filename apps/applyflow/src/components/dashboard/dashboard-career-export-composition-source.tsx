"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import {
  deriveExportCompositionSourceViewModel,
  type ExportCompositionSourceViewModel,
} from "@/lib/derive-export-composition-source-view-model";
import type { CareerBundleSyncEnrichmentSourceKind } from "@/lib/career-bundle-sync-enrichment-source";
import { DASHBOARD_CAREER_EXPORT_COMPOSITION_TRANSIENT_NOTICE } from "./dashboard-career-export-content";

function badgeTone(
  viewModel: ExportCompositionSourceViewModel,
): "intel" | "neutral" | "warning" {
  if (viewModel.isProviderDerived) {
    return "intel";
  }

  if (viewModel.isDemo) {
    return "warning";
  }

  return "neutral";
}

export function DashboardCareerExportCompositionSourceView({
  viewModel,
}: {
  viewModel: ExportCompositionSourceViewModel;
}) {
  return (
    <div
      className="space-y-2 rounded-lg border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/40 p-3"
      data-testid="dashboard-career-export-composition-source"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium text-[color:var(--af-text)]">Composição de enrichment</p>
        <span data-testid="dashboard-career-export-source-badge">
          <ApplyFlowBadge tone={badgeTone(viewModel)}>{viewModel.label}</ApplyFlowBadge>
        </span>
      </div>
      <p
        className="text-[11px] leading-snug text-[color:var(--af-text-muted)]"
        data-testid="dashboard-career-export-source-description"
      >
        {viewModel.description}
      </p>
      <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        {DASHBOARD_CAREER_EXPORT_COMPOSITION_TRANSIENT_NOTICE}
      </p>
    </div>
  );
}

export function DashboardCareerExportCompositionSource({
  sourceKind,
}: {
  sourceKind: CareerBundleSyncEnrichmentSourceKind;
}) {
  const viewModel = deriveExportCompositionSourceViewModel(sourceKind);

  return <DashboardCareerExportCompositionSourceView viewModel={viewModel} />;
}
