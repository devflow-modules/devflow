import { mapWebhookBodyToEvents } from "./whatsappWebhook.mapper";
import {
  logWebhookEvent,
  logWebhookInboundSummary,
  logWebhookVerification,
  maskVerifyToken,
} from "./whatsappWebhook.logger";
import type { MetaWebhookBody, ParsedWebhookEvent } from "./whatsappWebhook.types";

export function verifyWebhookSubscription(params: {
  mode: string | undefined;
  verifyToken: string | undefined;
  challenge: string | undefined;
  expectedVerifyToken: string | undefined;
}):
  | { ok: true; challenge: string }
  | { ok: false; status: 403 | 400; reason: string } {
  const { mode, verifyToken, challenge, expectedVerifyToken } = params;
  const masked = maskVerifyToken(verifyToken);

  if (mode !== "subscribe") {
    logWebhookVerification({
      mode,
      tokenMatch: verifyToken === expectedVerifyToken,
      verifyTokenMasked: masked,
      result: "invalid_mode",
    });
    return { ok: false, status: 403, reason: "hub.mode must be subscribe" };
  }

  if (!expectedVerifyToken) {
    logWebhookVerification({
      mode,
      tokenMatch: false,
      verifyTokenMasked: masked,
      result: "denied",
    });
    return { ok: false, status: 403, reason: "WHATSAPP_VERIFY_TOKEN not configured" };
  }

  if (verifyToken !== expectedVerifyToken) {
    logWebhookVerification({
      mode,
      tokenMatch: false,
      verifyTokenMasked: masked,
      result: "denied",
    });
    return { ok: false, status: 403, reason: "Invalid verify token" };
  }

  if (challenge === undefined || challenge === null || String(challenge).length === 0) {
    logWebhookVerification({
      mode,
      tokenMatch: true,
      verifyTokenMasked: masked,
      result: "missing_challenge",
    });
    return { ok: false, status: 400, reason: "hub.challenge missing" };
  }

  logWebhookVerification({
    mode,
    tokenMatch: true,
    verifyTokenMasked: masked,
    result: "success",
  });

  return { ok: true, challenge: String(challenge) };
}

export function parseInboundWebhookBody(body: unknown): {
  events: ParsedWebhookEvent[];
  parseError?: string;
} {
  try {
    const b = body as MetaWebhookBody;
    if (typeof b !== "object" || b === null) {
      return { events: [], parseError: "body_not_object" };
    }
    const events = mapWebhookBodyToEvents(b);
    const kinds: Record<string, number> = {};
    for (const e of events) {
      kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    }
    logWebhookInboundSummary({
      object: b.object,
      entryCount: Array.isArray(b.entry) ? b.entry.length : 0,
      eventsParsed: events.length,
      kinds,
    });
    for (const ev of events) {
      logWebhookEvent(summarizeEventForLog(ev));
    }
    return { events };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse_error";
    return { events: [], parseError: msg };
  }
}

function summarizeEventForLog(ev: ParsedWebhookEvent): Record<string, unknown> {
  if (ev.kind === "message") {
    return {
      kind: ev.kind,
      messageId: ev.messageId,
      fromMasked: ev.from ? `***${ev.from.slice(-4)}` : undefined,
      type: ev.type,
      field: ev.field,
    };
  }
  if (ev.kind === "status") {
    return {
      kind: ev.kind,
      messageId: ev.messageId,
      status: ev.status,
      recipientMasked: ev.recipientId ? `***${ev.recipientId.slice(-4)}` : undefined,
    };
  }
  if (ev.kind === "errors") {
    return { kind: ev.kind, errorsCount: ev.errors.length, field: ev.field };
  }
  return {
    kind: ev.kind,
    summary: "summary" in ev ? ev.summary : undefined,
    field: "field" in ev ? ev.field : undefined,
  };
}
