/**
 * Handler do webhook WhatsApp Cloud API.
 * GET  — Verificação Meta (hub.mode, hub.verify_token, hub.challenge).
 * POST — Eventos: normalizar → resolver tenant → persistir → IA/legado.
 *
 * Usado por /api/webhook/whatsapp e /api/webhooks/whatsapp.
 */

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebhookPayload, type IncomingTextMessage } from "@devflow/whatsapp-core";
import { jsonError, newTraceId, withTraceHeaders } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { resolveTenantByPhoneNumberId } from "@/modules/whatsapp/tenantResolutionService";
import {
  prepareInboundConversation,
  processLegacyInboundAutoReply,
} from "@/modules/messaging/webhookProcessingService";
import { checkTenantAiAutomationReady, runTenantAiAutoReply } from "@/modules/ai/aiAutomationService";
import { persistWaInboxFromWebhook } from "@/modules/inbox";
import { trackWebhookReceived } from "@/modules/analytics";
import {
  bumpMetric,
  logError,
  logEvent,
  logWhatsappPilotEvent,
  WHATSAPP_PILOT_EVENTS,
} from "@/lib/observability";
import { recordWebhookProcessingSuccess } from "@/modules/operations/webhookHealthService";
import { isOperationalAutomationEnabled } from "@/modules/operations/tenantOperationalConfigService";
import { logWebhookVerifiedOnce } from "@/modules/whatsapp/channelEventService";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import { logWhatsappWebhookDebug } from "@/lib/serverVerboseLog";
import {
  validateWebhookSignatureForRequest,
  webhookSignatureFailureMessage,
} from "@/modules/whatsapp/webhookSignature";

type WabaWebhookShape = {
  entry?: Array<{
    changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
  }>;
};

/** Evita repetir IA/legado quando a Meta reenvia o mesmo message_id e já existe registo de pipeline. */
async function hasInboundPipelineAudit(tenantId: string, inboundWaMessageId: string): Promise<boolean> {
  const n = await prisma.aiMessageLog.count({
    where: { tenantId, inboundWaMessageId },
  });
  return n > 0;
}

function extractRawWebhookStructure(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as WabaWebhookShape;
  if (!Array.isArray(raw.entry) || raw.entry.length === 0) return null;
  const changes = raw.entry.flatMap((e) => e.changes ?? []).map((c) => {
    const v = c.value as Record<string, unknown> | undefined;
    const msgs = Array.isArray(v?.messages) ? v.messages : [];
    const sts = Array.isArray(v?.statuses) ? v.statuses : [];
    const meta = v?.metadata && typeof v.metadata === "object" ? (v.metadata as Record<string, unknown>) : {};
    return {
      field: c.field ?? "?",
      messagesLen: msgs.length,
      statusesLen: sts.length,
      phoneNumberId: meta.phone_number_id ?? "(none)",
    };
  });
  return { changes };
}

export async function handleWebhookVerification(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  const traceId = newTraceId();
  logWhatsappPilotEvent("info", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_GET_VERIFY_RECEIVED, {
    correlationId: traceId,
    origin: "webhook",
    status: mode ?? "(empty)",
    reason: token ? "token_present" : "token_missing",
  });

  if (mode === "subscribe" && token === verifyToken) {
    logWhatsappPilotEvent("info", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_GET_VERIFY_SUCCESS, {
      correlationId: traceId,
      origin: "webhook",
    });
    return withTraceHeaders(
      new NextResponse(challenge ?? "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
      traceId
    );
  }

  logWhatsappPilotEvent("warn", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_GET_VERIFY_FAILED, {
    correlationId: traceId,
    origin: "webhook",
    reason: "verify_mismatch",
    status: mode ?? "(empty)",
  });
  return jsonError("WEBHOOK_VERIFY_FORBIDDEN", "Webhook verification failed.", 403, { traceId });
}

export async function handleWebhookEvents(request: Request): Promise<NextResponse> {
  const traceId = newTraceId();
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    logEvent("warn", "webhook", "invalid_body_read", {}, { trace_id: traceId });
    return jsonError("INVALID_BODY", "Invalid request body", 400, { traceId });
  }

  const signatureHeader = request.headers.get("X-Hub-Signature-256");
  const signatureResult = validateWebhookSignatureForRequest(rawBody, signatureHeader);

  if (!signatureResult.ok) {
    const logEventName =
      signatureResult.code === "WEBHOOK_SIGNATURE_MISSING"
        ? WHATSAPP_PILOT_EVENTS.WEBHOOK_SIGNATURE_MISSING
        : WHATSAPP_PILOT_EVENTS.WEBHOOK_SIGNATURE_INVALID;
    logWhatsappPilotEvent("warn", "webhook", logEventName, {
      correlationId: traceId,
      origin: "webhook",
      errorCode: signatureResult.code,
    });
    return jsonError(
      signatureResult.code,
      webhookSignatureFailureMessage(signatureResult.code),
      signatureResult.status,
      { traceId }
    );
  }

  if (signatureResult.bypass) {
    logWhatsappPilotEvent("info", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_SIGNATURE_BYPASSED, {
      correlationId: traceId,
      origin: "webhook",
    });
  } else {
    logWhatsappPilotEvent("info", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_SIGNATURE_VALIDATED, {
      correlationId: traceId,
      origin: "webhook",
    });
  }

  let body: unknown;
  try {
    body = rawBody.length === 0 ? null : JSON.parse(rawBody);
  } catch {
    logEvent("warn", "webhook", "invalid_json", {}, { trace_id: traceId });
    return jsonError("INVALID_JSON_BODY", "Invalid JSON", 400, { traceId });
  }

  try {
    return await handleWebhookEventsBody(body, traceId);
  } catch (err) {
    logError("webhook", err, { phase: "handleWebhookEventsBody" }, { trace_id: traceId });
    return withTraceHeaders(NextResponse.json({ ok: true, trace_id: traceId }, { status: 200 }), traceId);
  }
}

async function handleWebhookEventsBody(body: unknown, traceId: string): Promise<NextResponse> {
  bumpMetric("webhook_posts");
  const bodyObj = body as Record<string, unknown> | null;
  const bodySummary =
    bodyObj && typeof bodyObj === "object"
      ? {
          object: bodyObj.object ?? "?",
          entryLen: Array.isArray(bodyObj.entry) ? bodyObj.entry.length : 0,
        }
      : "not_object";
  logWhatsappWebhookDebug("[WHATSAPP][DEBUG] POST received", JSON.stringify(bodySummary));

  const rawStructure = extractRawWebhookStructure(body);
  if (rawStructure) {
    logWhatsappWebhookDebug("[WHATSAPP][DEBUG] raw payload structure", JSON.stringify(rawStructure));
  }

  const normalized = normalizeWebhookPayload(body);
  if (!normalized) {
    logEvent(
      "warn",
      "webhook",
      "payload_not_normalizable",
      { bodySummary },
      { trace_id: traceId }
    );
    return withTraceHeaders(NextResponse.json({ ok: true, trace_id: traceId }, { status: 200 }), traceId);
  }

  const messagesCount = normalized.messages.length;
  const statusesCount = normalized.statuses.length;
  logWhatsappPilotEvent("info", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_POST_RECEIVED, {
    correlationId: traceId,
    origin: "webhook",
    phoneNumberId: normalized.phoneNumberId || undefined,
    messagesCount,
    statusesCount,
    statusOnly: messagesCount === 0 && statusesCount > 0,
  });

  trackWebhookReceived();

  const tenant = await resolveTenantByPhoneNumberId(normalized.phoneNumberId).catch((err) => {
    const errMsg = err?.message ?? String(err);
    logError(
      "webhook",
      err,
      { phase: "tenant_resolution", phoneNumberId: normalized.phoneNumberId },
      { trace_id: traceId }
    );
    if (errMsg.includes("prepared statement") && errMsg.includes("already exists")) {
      console.error(
        "[WHATSAPP][HINT] Se usar pooler (Supabase/Neon/Vercel Postgres), adicione ?pgbouncer=true na WHATSAPP_DATABASE_URL"
      );
    }
    return null;
  });
  if (!tenant) {
    logWhatsappPilotEvent("warn", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_TENANT_UNRESOLVED, {
      correlationId: traceId,
      origin: "webhook",
      phoneNumberId: normalized.phoneNumberId || undefined,
      messagesCount: normalized.messages.length,
    });
    return withTraceHeaders(NextResponse.json({ ok: true, trace_id: traceId }, { status: 200 }), traceId);
  }

  logWhatsappPilotEvent("info", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_TENANT_RESOLVED, {
    correlationId: traceId,
    origin: "webhook",
    tenantId: tenant.id,
    phoneNumberId: tenant.phoneNumberId,
  });
  logWhatsappWebhookDebug("[WHATSAPP][DEBUG] tenant resolved", {
    tenantId: tenant.id,
    phoneNumberId: tenant.phoneNumberId,
  });

  const whatsappLine = await prisma.whatsappPhoneNumber.findFirst({
    where: { phoneNumberId: tenant.phoneNumberId },
    select: { id: true },
  });
  if (whatsappLine) {
    await logWebhookVerifiedOnce(whatsappLine.id);
  }

  await persistWaInboxFromWebhook(tenant.id, tenant.phoneNumberId, body, { traceId }).catch((err) =>
    logError("webhook", err, { phase: "wa_inbox_persist", tenantId: tenant.id }, { trace_id: traceId, tenant_id: tenant.id })
  );

  const inboundTextCount = normalized.messages.filter((m) => m.type === "text").length;
  if (inboundTextCount > 0) {
    bumpMetric("messages_received", inboundTextCount);
  }
  logEvent(
    "info",
    "webhook",
    "events_received",
    {
      textMessages: inboundTextCount,
      statuses: statusesCount,
    },
    { trace_id: traceId, tenant_id: tenant.id }
  );
  // Alias legado mantido; evento canónico é webhook_post_received (acima).

  const seenConversations = new Set<string>();
  if (normalized.messages.length === 0) {
    logWhatsappWebhookDebug("[WHATSAPP][DEBUG] no text messages in payload (only statuses or non-text)");
  } else {
    logWhatsappWebhookDebug("[WHATSAPP][DEBUG] messages to process", normalized.messages.length);
    for (let i = 0; i < normalized.messages.length; i++) {
      const m = normalized.messages[i];
      logWhatsappWebhookDebug("[WHATSAPP][DEBUG] message", i + 1, {
        type: m.type,
        from: m.from ? `${m.from.slice(0, 4)}***` : "(empty)",
        msgId: m.id,
        hasText: !!(m as { text?: { body?: string } }).text?.body,
      });
    }
  }
  for (const msg of normalized.messages) {
    if (msg.type !== "text") {
      logWhatsappWebhookDebug("[WHATSAPP][DEBUG] skip non-text message", { type: msg.type, msgId: msg.id });
      continue;
    }
    const textBody = (msg as IncomingTextMessage).text?.body;
    if (!textBody?.trim()) {
      logWhatsappWebhookDebug("[WHATSAPP][DEBUG] skip empty text", { msgId: msg.id });
      continue;
    }

    const outboundPipelineReady =
      tenant.channelStatus === WhatsappPhoneNumberStatus.ACTIVE &&
      Boolean(tenant.accessToken?.trim());
    if (!outboundPipelineReady) {
      logEvent(
        "info",
        "webhook",
        "inbound_pipeline_skipped_channel_not_active",
        { inbound_wa_message_id: msg.id },
        { trace_id: traceId, tenant_id: tenant.id }
      );
      continue;
    }

    if (await hasInboundPipelineAudit(tenant.id, msg.id)) {
      bumpMetric("webhook_pipeline_skipped_duplicate");
      logEvent(
        "info",
        "webhook",
        "inbound_pipeline_skipped_duplicate",
        { inbound_wa_message_id: msg.id },
        { trace_id: traceId, tenant_id: tenant.id }
      );
      continue;
    }

    logWhatsappWebhookDebug("[WHATSAPP][DEBUG] processing text message — about to prepare/reply", {
      msgId: msg.id,
      from: msg.from,
      tenantId: tenant.id,
    });

    const key = `${tenant.id}:${msg.from}:${tenant.phoneNumberId}`;
    const isNewConversation = !seenConversations.has(key);
    seenConversations.add(key);

    let prep;
    try {
      prep = await prepareInboundConversation({
        tenant,
        message: msg,
        isNewConversation,
      });
    } catch (prepErr) {
      logError(
        "webhook",
        prepErr,
        { phase: "prepare_inbound_conversation", meta_message_id: msg.id },
        { trace_id: traceId, tenant_id: tenant.id }
      );
      continue;
    }
    if (!prep) {
      logWhatsappWebhookDebug("[WHATSAPP][DEBUG] prepareInboundConversation returned null", { msgId: msg.id });
      continue;
    }

    try {
      const aiReady = await checkTenantAiAutomationReady(tenant.id, msg.from, tenant.phoneNumberId);
      if (aiReady.ready) {
        logWhatsappWebhookDebug("[WHATSAPP][DEBUG] using AI path", { msgId: msg.id, reason: aiReady.reason });
        try {
          await runTenantAiAutoReply({
            tenant,
            message: msg,
            inboxThreadId: prep.inboxThreadId,
            textBody: prep.textBody,
            traceId,
          });
        } catch (aiErr) {
          bumpMetric("ai_auto_reply_failed");
          logError(
            "webhook",
            aiErr,
            { phase: "ai_auto_reply", inbound_wa_message_id: msg.id },
            { trace_id: traceId, tenant_id: tenant.id }
          );
          if (!(await isOperationalAutomationEnabled(tenant.id))) {
            continue;
          }
          try {
            await processLegacyInboundAutoReply(tenant, msg, prep.inboxThreadId, prep.textBody);
          } catch (legErr) {
            logError(
              "webhook",
              legErr,
              { phase: "legacy_reply_after_ai_error", meta_message_id: msg.id },
              { trace_id: traceId, tenant_id: tenant.id }
            );
          }
        }
      } else {
        logWhatsappWebhookDebug("[WHATSAPP][DEBUG] using legacy path", { msgId: msg.id, reason: aiReady.reason });
        if (!(await isOperationalAutomationEnabled(tenant.id))) {
          logWhatsappWebhookDebug("[WHATSAPP][DEBUG] skip legacy auto-reply — automação pausada", {
            tenantId: tenant.id,
          });
          continue;
        }
        try {
          await processLegacyInboundAutoReply(tenant, msg, prep.inboxThreadId, prep.textBody);
        } catch (legErr) {
          logError(
            "webhook",
            legErr,
            { phase: "legacy_reply", meta_message_id: msg.id },
            { trace_id: traceId, tenant_id: tenant.id }
          );
        }
      }
    } catch (pipeErr) {
      logError(
        "webhook",
        pipeErr,
        { phase: "inbound_pipeline", meta_message_id: msg.id },
        { trace_id: traceId, tenant_id: tenant.id }
      );
    }
  }

  await recordWebhookProcessingSuccess(tenant.id).catch((err) =>
    logError(
      "webhook",
      err,
      { phase: "webhook_health_record_success", tenantId: tenant.id },
      { trace_id: traceId, tenant_id: tenant.id }
    )
  );

  logWhatsappWebhookDebug("[WHATSAPP][DEBUG] webhook POST completed successfully");
  return withTraceHeaders(NextResponse.json({ ok: true, trace_id: traceId }, { status: 200 }), traceId);
}
