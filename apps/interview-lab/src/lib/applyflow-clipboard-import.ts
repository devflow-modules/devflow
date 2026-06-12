import { parseCareerBundle, type ParseCareerBundleResult } from "@devflow/career-core";
import {
  parseCareerBundleImportWithSyncPreview,
  type ParseCareerBundleImportWithSyncPreviewResult,
} from "./career-bundle-sync-preview";

/**
 * Parses clipboard text as JSON then validates with {@link parseCareerBundle}.
 * Browser-only `readText` stays in the UI; this helper is unit-tested.
 */
export function parseCareerBundleFromClipboardText(raw: string): ParseCareerBundleResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Clipboard is empty." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, error: "Clipboard does not contain valid JSON." };
  }
  return parseCareerBundle(parsed);
}

/**
 * Parses clipboard JSON and returns a base CareerBundle plus optional sync enrichment preview.
 * Sync enrichment is validated but not persisted by callers.
 */
export function parseCareerBundleFromClipboardTextWithSyncPreview(
  raw: string,
): ParseCareerBundleImportWithSyncPreviewResult | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Clipboard is empty." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, error: "Clipboard does not contain valid JSON." };
  }
  return parseCareerBundleImportWithSyncPreview(parsed);
}
