import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS,
  DASHBOARD_CAREER_EXPORT_SOURCE_LABELS,
} from "./dashboard-career-export-content";
import { DashboardCareerExportCompositionSource } from "./dashboard-career-export-composition-source";

describe("DashboardCareerExportCompositionSource", () => {
  it("renders none source without apply or save actions", () => {
    const html = renderToStaticMarkup(<DashboardCareerExportCompositionSource sourceKind="none" />);

    expect(html).toContain(DASHBOARD_CAREER_EXPORT_SOURCE_LABELS.none);
    expect(html).toContain(DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS.none);
    expect(html).toContain("temporária");
    expect(html).not.toMatch(/>Apply<|>Save<|Confirm changes|perfil sincronizado|enrichment salvo/i);
    expect(html).not.toMatch(/access_token|connectionId|selectedSignalIds|providerPayload/i);
  });

  it("renders demo source", () => {
    const html = renderToStaticMarkup(<DashboardCareerExportCompositionSource sourceKind="demo" />);

    expect(html).toContain(DASHBOARD_CAREER_EXPORT_SOURCE_LABELS.demo);
    expect(html).toContain(DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS.demo);
  });

  it("renders provider-derived source", () => {
    const html = renderToStaticMarkup(
      <DashboardCareerExportCompositionSource sourceKind="provider-derived-proposal" />,
    );

    expect(html).toContain(DASHBOARD_CAREER_EXPORT_SOURCE_LABELS["provider-derived-proposal"]);
    expect(html).toContain(DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS["provider-derived-proposal"]);
  });
});
