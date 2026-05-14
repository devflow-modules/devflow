import { z } from "zod";
import { parseCareerBundle } from "./bundle-helpers.js";
import type { CareerBundle } from "./schemas/careerBundle.js";

export const DEVFLOW_CAREER_BUNDLE_MESSAGE_TYPE = "devflow.careerBundle.v1" as const;
export const DEVFLOW_CAREER_BUNDLE_ACK_TYPE = "devflow.careerBundle.ack.v1" as const;

export const APPLYFLOW_POST_MESSAGE_SOURCE = "applyflow" as const;
export const INTERVIEW_LAB_POST_MESSAGE_SOURCE = "interview-lab" as const;

export const careerBundleHandoffIntentSchema = z.enum(["import", "practice"]);
export type CareerBundleHandoffIntent = z.infer<typeof careerBundleHandoffIntentSchema>;

const handshakeSchema = z.object({
  type: z.literal(DEVFLOW_CAREER_BUNDLE_MESSAGE_TYPE),
  source: z.literal(APPLYFLOW_POST_MESSAGE_SOURCE),
  payload: z.unknown(),
  intent: careerBundleHandoffIntentSchema.optional(),
  selectedApplicationId: z.string().min(1).optional(),
});

const ackSchema = z.object({
  type: z.literal(DEVFLOW_CAREER_BUNDLE_ACK_TYPE),
  source: z.literal(INTERVIEW_LAB_POST_MESSAGE_SOURCE),
  ok: z.boolean(),
});

export type CareerBundleHandshakeMessage = z.infer<typeof handshakeSchema>;
export type CareerBundleHandshakeAck = z.infer<typeof ackSchema>;

export type CreateCareerBundleHandshakeMessageOptions = {
  intent?: CareerBundleHandoffIntent;
  selectedApplicationId?: string;
};

export function createCareerBundleHandshakeMessage(
  bundle: CareerBundle,
  opts?: CreateCareerBundleHandshakeMessageOptions,
): CareerBundleHandshakeMessage {
  const base: CareerBundleHandshakeMessage = {
    type: DEVFLOW_CAREER_BUNDLE_MESSAGE_TYPE,
    source: APPLYFLOW_POST_MESSAGE_SOURCE,
    payload: bundle,
  };
  if (opts?.intent !== undefined) {
    base.intent = opts.intent;
  }
  if (opts?.selectedApplicationId !== undefined && opts.selectedApplicationId.length > 0) {
    base.selectedApplicationId = opts.selectedApplicationId;
  }
  return base;
}

export function createCareerBundleHandshakeAck(ok: boolean): CareerBundleHandshakeAck {
  return {
    type: DEVFLOW_CAREER_BUNDLE_ACK_TYPE,
    source: INTERVIEW_LAB_POST_MESSAGE_SOURCE,
    ok,
  };
}

/** Normalise URL string to `origin` (scheme + host + port). */
export function normalizeWebOrigin(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Origins allowed to post a CareerBundle handshake to Interview Lab.
 * If `configuredApplyflowUrl` is set (e.g. `NEXT_PUBLIC_APPLYFLOW_URL`), only that origin is accepted.
 * Otherwise local dev defaults: ApplyFlow on port 3010.
 */
export function buildAllowedApplyflowOriginsList(configuredApplyflowUrl?: string | null): string[] {
  const c = configuredApplyflowUrl?.trim();
  if (c) {
    const n = normalizeWebOrigin(c);
    return n ? [n] : [];
  }
  return ["http://localhost:3010", "http://127.0.0.1:3010"];
}

export function isAllowedApplyflowPostMessageOrigin(origin: string, configuredApplyflowUrl?: string | null): boolean {
  const allowed = buildAllowedApplyflowOriginsList(configuredApplyflowUrl);
  return allowed.includes(origin);
}

export type ParseHandshakeBundleMessageSuccess = {
  bundle: CareerBundle;
  /** Defaults to `"import"` when omitted (legacy messages). */
  intent: CareerBundleHandoffIntent;
  selectedApplicationId?: string;
};

export type ParseHandshakeBundleMessageResult =
  | ({ ok: true } & ParseHandshakeBundleMessageSuccess)
  | { ok: false; error: string; kind: "shape" | "bundle" };

/** Validates handshake envelope + {@link parseCareerBundle} on payload. */
export function parseHandshakeCareerBundleMessage(data: unknown): ParseHandshakeBundleMessageResult {
  const env = handshakeSchema.safeParse(data);
  if (!env.success) {
    return { ok: false, error: "Not a DevFlow CareerBundle handshake message.", kind: "shape" };
  }
  const r = parseCareerBundle(env.data.payload);
  if (!r.ok) {
    return { ok: false, error: r.error, kind: "bundle" };
  }
  const intent: CareerBundleHandoffIntent = env.data.intent ?? "import";
  return {
    ok: true,
    bundle: r.data,
    intent,
    selectedApplicationId: env.data.selectedApplicationId,
  };
}

export type ParseHandshakeAckResult = { ok: true; ack: CareerBundleHandshakeAck } | { ok: false };

export function parseHandshakeCareerBundleAck(data: unknown): ParseHandshakeAckResult {
  const r = ackSchema.safeParse(data);
  if (!r.success) return { ok: false };
  return { ok: true, ack: r.data };
}
