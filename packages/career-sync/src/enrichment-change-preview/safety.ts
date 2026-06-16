import { collectForbiddenKeysInDocument } from "../provider-derived-enrichment-export/forbidden-keys.js";
import type { EnrichmentChangePreviewResult } from "./types.js";

export function assertEnrichmentChangePreviewSafe(value: EnrichmentChangePreviewResult): void {
  const forbidden = collectForbiddenKeysInDocument(value);

  if (forbidden.length > 0) {
    throw new Error(`forbidden_keys_in_enrichment_change_preview:${forbidden.join(",")}`);
  }
}
