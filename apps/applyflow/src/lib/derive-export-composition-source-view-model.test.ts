import { describe, expect, it } from "vitest";
import { deriveExportCompositionSourceViewModel } from "./derive-export-composition-source-view-model";
import {
  DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS,
  DASHBOARD_CAREER_EXPORT_SOURCE_LABELS,
} from "@/components/dashboard/dashboard-career-export-content";

describe("deriveExportCompositionSourceViewModel", () => {
  it("maps none source", () => {
    const viewModel = deriveExportCompositionSourceViewModel("none");

    expect(viewModel).toEqual({
      kind: "none",
      label: DASHBOARD_CAREER_EXPORT_SOURCE_LABELS.none,
      description: DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS.none,
      hasEnrichment: false,
      isProviderDerived: false,
      isDemo: false,
    });
  });

  it("maps demo source", () => {
    const viewModel = deriveExportCompositionSourceViewModel("demo");

    expect(viewModel.kind).toBe("demo");
    expect(viewModel.hasEnrichment).toBe(true);
    expect(viewModel.isDemo).toBe(true);
    expect(viewModel.isProviderDerived).toBe(false);
  });

  it("maps provider-derived source", () => {
    const viewModel = deriveExportCompositionSourceViewModel("provider-derived-proposal");

    expect(viewModel.kind).toBe("provider-derived-proposal");
    expect(viewModel.hasEnrichment).toBe(true);
    expect(viewModel.isProviderDerived).toBe(true);
    expect(viewModel.isDemo).toBe(false);
  });

  it("falls back to none for invalid input", () => {
    const viewModel = deriveExportCompositionSourceViewModel("invalid" as "none");

    expect(viewModel.kind).toBe("none");
    expect(viewModel.hasEnrichment).toBe(false);
  });
});
