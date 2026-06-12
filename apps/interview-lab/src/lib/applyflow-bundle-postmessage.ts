import {
  isAllowedApplyflowPostMessageOrigin,
  normalizeWebOrigin,
  parseHandshakeCareerBundleMessage,
  type CareerBundle,
  type CareerBundleHandoffIntent,
} from "@devflow/career-core";
import {
  parseCareerBundleImportWithSyncPreview,
  type InterviewLabSyncEnrichmentPreview,
} from "./career-bundle-sync-preview";

export type EvaluateApplyflowBundlePostMessageResult =
  | { action: "ignore" }
  | { action: "invalid_bundle"; error: string }
  | {
      action: "accept";
      bundle: CareerBundle;
      syncPreview: InterviewLabSyncEnrichmentPreview;
      intent: CareerBundleHandoffIntent;
      selectedApplicationId?: string;
    };

/**
 * Decides whether a window message is an ApplyFlow CareerBundle handshake and validates the payload.
 * Wrong-shape messages from an allowed origin are treated as ignore (noise).
 */
export function evaluateApplyflowBundlePostMessage(
  event: Pick<MessageEvent, "data" | "origin">,
  configuredApplyflowUrl?: string | null,
): EvaluateApplyflowBundlePostMessageResult {
  if (!isAllowedApplyflowPostMessageOrigin(event.origin, configuredApplyflowUrl)) {
    return { action: "ignore" };
  }
  const r = parseHandshakeCareerBundleMessage(event.data);
  if (!r.ok && r.kind === "shape") {
    return { action: "ignore" };
  }
  if (!r.ok) {
    return { action: "invalid_bundle", error: r.error };
  }

  const payload =
    event.data != null && typeof event.data === "object" && "payload" in event.data
      ? (event.data as { payload: unknown }).payload
      : undefined;
  const imported = parseCareerBundleImportWithSyncPreview(payload ?? r.bundle);
  if (!imported.ok) {
    return { action: "invalid_bundle", error: imported.error };
  }

  return {
    action: "accept",
    bundle: imported.bundle,
    syncPreview: imported.preview,
    intent: r.intent,
    selectedApplicationId: r.selectedApplicationId,
  };
}

export function getApplyflowAckTargetOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APPLYFLOW_URL?.trim();
  if (!raw) return "http://localhost:3010";
  if (raw.includes("://")) {
    return normalizeWebOrigin(raw) ?? "http://localhost:3010";
  }
  return normalizeWebOrigin(`http://${raw}`) ?? "http://localhost:3010";
}
