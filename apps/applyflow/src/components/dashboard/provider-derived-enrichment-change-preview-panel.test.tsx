import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CAREER_BUNDLE,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_TITLE,
} from "./provider-derived-enrichment-change-preview-content";
import { ProviderDerivedEnrichmentChangePreviewPanel } from "./provider-derived-enrichment-change-preview-panel";
import { createInitialProviderDerivedRuntimeReviewState } from "./provider-derived-runtime-review-state";

describe("ProviderDerivedEnrichmentChangePreviewPanel render", () => {
  it("renders empty proposal state without apply or save actions", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentChangePreviewPanel
        proposal={null}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        exportAvailable={false}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_TITLE);
    expect(html).toContain(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CAREER_BUNDLE);
    expect(html).not.toMatch(/data-testid="[^"]*apply|>Apply<|>Save<|Confirm changes|Update profile|Synchronize/i);
    expect(html).not.toMatch(/access_token|connectionId|providerPayload/i);
  });
});
