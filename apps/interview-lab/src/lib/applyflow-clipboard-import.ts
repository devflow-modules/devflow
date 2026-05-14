import { parseCareerBundle, type ParseCareerBundleResult } from "@devflow/career-core";

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
