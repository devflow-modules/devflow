import type { CareerBundle } from "@devflow/career-core";

/** Default when `NEXT_PUBLIC_INTERVIEW_LAB_URL` is unset (local Interview Lab). */
export const DEFAULT_INTERVIEW_LAB_ORIGIN = "http://localhost:3015";

export function getInterviewLabOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_INTERVIEW_LAB_URL?.trim();
  if (!raw) return DEFAULT_INTERVIEW_LAB_ORIGIN;
  return raw.replace(/\/+$/, "");
}

/** Opens Interview Lab import with `?from=applyflow` (hint only; no bundle in URL). */
export function getInterviewLabImportHandoffUrl(): string {
  return `${getInterviewLabOrigin()}/import/applyflow?from=applyflow`;
}

/** Same as {@link getInterviewLabImportHandoffUrl} plus `handoff=postMessage` for one-click ApplyFlow → Interview Lab. */
export function getInterviewLabImportPostMessageHandoffUrl(): string {
  return `${getInterviewLabOrigin()}/import/applyflow?from=applyflow&handoff=postMessage`;
}

/** Same JSON shape as file download (`JSON.stringify(bundle, null, 2)`). */
export function stringifyCareerBundleJson(bundle: CareerBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export async function copyCareerBundleJsonToClipboard(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return {
      ok: false,
      error: "Clipboard not available. Use Export JSON to download the file instead.",
    };
  }
  try {
    await navigator.clipboard.writeText(json);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not copy to clipboard. Use Export JSON to download the file instead.",
    };
  }
}
