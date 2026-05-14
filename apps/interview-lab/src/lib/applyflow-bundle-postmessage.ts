import {
  isAllowedApplyflowPostMessageOrigin,
  normalizeWebOrigin,
  parseHandshakeCareerBundleMessage,
  type CareerBundle,
} from "@devflow/career-core";

export type EvaluateApplyflowBundlePostMessageResult =
  | { action: "ignore" }
  | { action: "invalid_bundle"; error: string }
  | { action: "accept"; bundle: CareerBundle };

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
  return { action: "accept", bundle: r.bundle };
}

export function getApplyflowAckTargetOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APPLYFLOW_URL?.trim();
  if (!raw) return "http://localhost:3010";
  if (raw.includes("://")) {
    return normalizeWebOrigin(raw) ?? "http://localhost:3010";
  }
  return normalizeWebOrigin(`http://${raw}`) ?? "http://localhost:3010";
}
