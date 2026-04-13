/**
 * Handler do webhook WhatsApp Cloud API.
 * GET  — Verificação Meta (hub.mode, hub.verify_token, hub.challenge).
 * POST — Eventos: normalizar → resolver tenant → persistir → IA/legado.
 *
 * Usado por /api/webhook/whatsapp e /api/webhooks/whatsapp.
 */

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebhookPayload, type IncomingTextMessage } from "@devflow/whatsapp-core";
import { APP_PRODUCT_SLUG } from "@/lib/constants";
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
import { bumpMetric, logError, logEvent } from "@/lib/observability";
import { recordWebhookProcessingSuccess } from "@/modules/operations/webhookHealthService";
import { isOperationalAutomationEnabled } from "@/modules/operations/tenantOperationalConfigService";
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
  if (mode === "subscribe" && token === verifyToken) {
    return withTraceHeaders(
      new NextResponse(challenge ?? "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
      traceId
    );
  }

  console.warn("[WHATSAPP][INFO] GET webhook verify não corresponde", {
    mode: mode ?? "(empty)",
    tokenPresent: Boolean(token),
    challengePresent: Boolean(challenge),
  });
  return withTraceHeaders(
    NextResponse.json({ product: APP_PRODUCT_SLUG, webhook: "whatsapp", method: "GET" }),
    traceId
  );
}

export async function handleWebhookEvents(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const traceId = newTraceId();
    logEvent("warn", "webhook", "invalid_json", {}, { trace_id: traceId });
    return jsonError("INVALID_JSON_BODY", "Invalid JSON", 400, { traceId });
  }

  try {
    return await handleWebhookEventsBody(body);
  } catch (err) {
    const traceId = newTraceId();
    logError("webhook", err, { phase: "handleWebhookEventsBody" }, { trace_id: traceId });
    return withTraceHeaders(NextResponse.json({ ok: true, trace_id: traceId }, { status: 200 }), traceId);
  }
}

async function handleWebhookEventsBody(body: unknown): Promise<NextResponse> {
  const traceId = newTraceId();
  bumpMetric("webhook_posts");
  const bodyObj = body as Record<string, unknown> | null;
  const bodySummary =
    bodyObj && typeof bodyObj === "object"
      ? {
          object: bodyObj.object ?? "?",
          entryLen: Array.isArray(bodyObj.entry) ? bodyObj.entry.length : 0,
        }
      : "not_object";
  console.log("[WHATSAPP][DEBUG] POST received", JSON.stringify(bodySummary));

  const rawStructure = extractRawWebhookStructure(body);
  if (rawStructure) {
    console.log("[WHATSAPP][DEBUG] raw payload structure", JSON.stringify(rawStructure));
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
  console.log(
    "[WHATSAPP][DEBUG] normalized",
    JSON.stringify({
      phoneNumberId: normalized.phoneNumberId || "(empty)",
      messagesCount,
      statusesCount,
    })
  );

  if (messagesCount === 0 && statusesCount > 0) {
    console.log(
      "[WHATSAPP][INFO] status-only event — persisting statuses only, no inbound message to reply"
    );
  }

  trackWebhookReceived();

  const tenant = await resolveTenantByPhoneNumberId(normalized.phoneNumberId).catch((err) => {
    const errMsg = err?.message ?? String(err);
    logError("webhook", err, { phase: "tenant_resolution", phoneNumberId: normalized.phoneNumberId });
    if (errMsg.includes("prepared statement") && errMsg.includes("already exists")) {
      console.error(
        "[WHATSAPP][HINT] Se usar pooler (Supabase/Neon/Vercel Postgres), adicione ?pgbouncer=true na WHATSAPP_DATABASE_URL"
      );
    }
    return null;
  });
  if (!tenant) {
    logEvent(
      "warn",
      "webhook",
      "tenant_unresolved",
      {
        phoneNumberId: normalized.phoneNumberId || "",
        messagesCount: normalized.messages.length,
      },
      { trace_id: traceId }
    );
    return withTraceHeaders(NextResponse.json({ ok: true, trace_id: traceId }, { status: 200 }), traceId);
  }

  console.log("[WHATSAPP][DEBUG] tenant resolved", { tenantId: tenant.id, phoneNumberId: tenant.phoneNumberId });

  await persistWaInboxFromWebhook(tenant.id, tenant.phoneNumberId, body).catch((err) =>
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

  const seenConversations = new Set<string>();
  if (normalized.messages.length === 0) {
    console.log("[WHATSAPP][DEBUG] no text messages in payload (only statuses or non-text)");
  } else {
    console.log("[WHATSAPP][DEBUG] messages to process", normalized.messages.length);
    for (let i = 0; i < normalized.messages.length; i++) {
      const m = normalized.messages[i];
      console.log("[WHATSAPP][DEBUG] message", i + 1, {
        type: m.type,
        from: m.from ? `${m.from.slice(0, 4)}***` : "(empty)",
        msgId: m.id,
        hasText: !!(m as { text?: { body?: string } }).text?.body,
      });
    }
  }
  for (const msg of normalized.messages) {
    if (msg.type !== "text") {
      console.log("[WHATSAPP][DEBUG] skip non-text message", { type: msg.type, msgId: msg.id });
      continue;
    }
    const textBody = (msg as IncomingTextMessage).text?.body;
    if (!textBody?.trim()) {
      console.log("[WHATSAPP][DEBUG] skip empty text", { msgId: msg.id });
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

    console.info(
      "[WHATSAPP][DEBUG] processing text message — about to prepare/reply",
      { msgId: msg.id, from: msg.from, tenantId: tenant.id }
    );

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
      console.error("[WHATSAPP][ERROR] prepareInboundConversation", {
        msgId: msg.id,
        tenantId: tenant.id,
        err: prepErr instanceof Error ? prepErr.message : String(prepErr),
      });
      continue;
    }
    if (!prep) {
      console.warn("[WHATSAPP][DEBUG] prepareInboundConversation returned null", { msgId: msg.id });
      continue;
    }

    try {
      const aiReady = await checkTenantAiAutomationReady(tenant.id, msg.from, tenant.phoneNumberId);
      if (aiReady.ready) {
        console.log("[WHATSAPP][DEBUG] using AI path", { msgId: msg.id, reason: aiReady.reason });
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
            console.error("[WHATSAPP][ERROR] legacy reply falhou após erro de IA", {
              msgId: msg.id,
              tenantId: tenant.id,
              err: legErr instanceof Error ? legErr.message : String(legErr),
            });
          }
        }
      } else {
        console.log("[WHATSAPP][DEBUG] using legacy path", { msgId: msg.id, reason: aiReady.reason });
        if (!(await isOperationalAutomationEnabled(tenant.id))) {
          console.log("[WHATSAPP][DEBUG] skip legacy auto-reply — automação pausada", { tenantId: tenant.id });
          continue;
        }
        try {
          await processLegacyInboundAutoReply(tenant, msg, prep.inboxThreadId, prep.textBody);
        } catch (legErr) {
          console.error("[WHATSAPP][ERROR] legacy reply falhou", {
            msgId: msg.id,
            tenantId: tenant.id,
            err: legErr instanceof Error ? legErr.message : String(legErr),
          });
        }
      }
    } catch (pipeErr) {
      console.error("[WHATSAPP][ERROR] pipeline de mensagem (AI/legacy)", {
        msgId: msg.id,
        tenantId: tenant.id,
        err: pipeErr instanceof Error ? pipeErr.message : String(pipeErr),
      });
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

  console.log("[WHATSAPP][DEBUG] webhook POST completed successfully");
  return withTraceHeaders(NextResponse.json({ ok: true, trace_id: traceId }, { status: 200 }), traceId);
}
