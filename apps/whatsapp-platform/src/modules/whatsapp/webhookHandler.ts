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
import { resolveTenantByPhoneNumberId } from "@/modules/whatsapp/tenantResolutionService";
import {
  prepareInboundConversation,
  processLegacyInboundAutoReply,
  persistWebhookLog,
} from "@/modules/messaging/webhookProcessingService";
import { checkTenantAiAutomationReady, runTenantAiAutoReply } from "@/modules/ai/aiAutomationService";
import { persistWaInboxFromWebhook } from "@/modules/inbox";
import { trackWebhookReceived } from "@/modules/analytics";
import { hasSupabaseConfig } from "@/lib/supabase-server";

export async function handleWebhookVerification(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ product: APP_PRODUCT_SLUG, webhook: "whatsapp", method: "GET" });
}

export async function handleWebhookEvents(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error("[WHATSAPP][DEBUG] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // #region agent log
  const bodyObj = body as Record<string, unknown> | null;
  const bodySummary =
    bodyObj && typeof bodyObj === "object"
      ? {
          object: bodyObj.object ?? "?",
          entryLen: Array.isArray(bodyObj.entry) ? bodyObj.entry.length : 0,
        }
      : "not_object";
  console.log("[WHATSAPP][DEBUG] POST received", JSON.stringify(bodySummary));
  // #endregion

  const normalized = normalizeWebhookPayload(body);
  if (!normalized) {
    const msg =
      "[WHATSAPP][DEBUG] normalizeWebhookPayload returned null — object/entry invalid or empty messages";
    console.warn(msg);
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/2e3dda65-2e5f-4b28-b3c6-59ab727bd47c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "webhookHandler.ts:normalize_null",
        message: msg,
        data: bodySummary,
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ ok: true }, { status: 200 });
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
    console.error("[WHATSAPP][ERROR] tenant resolution:", err);
    if (errMsg.includes("prepared statement") && errMsg.includes("already exists")) {
      console.error(
        "[WHATSAPP][HINT] Se usar pooler (Supabase/Neon/Vercel Postgres), adicione ?pgbouncer=true na WHATSAPP_DATABASE_URL"
      );
    }
    return null;
  });
  if (!tenant) {
    const msg =
      "[WHATSAPP][DEBUG] tenant resolution failed — no WhatsappPhoneNumber/Tenant for phoneNumberId: " +
      (normalized.phoneNumberId || "(empty)");
    console.warn(msg);
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/2e3dda65-2e5f-4b28-b3c6-59ab727bd47c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "webhookHandler.ts:tenant_null",
        message: msg,
        data: { phoneNumberId: normalized.phoneNumberId || "", messagesCount: normalized.messages.length },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  console.log("[WHATSAPP][DEBUG] tenant resolved", { tenantId: tenant.id, phoneNumberId: tenant.phoneNumberId });

  if (hasSupabaseConfig()) {
    await persistWebhookLog(body, tenant.id).catch((err) =>
      console.error("[WHATSAPP][ERROR] webhook log insert:", err)
    );
  }

  await persistWaInboxFromWebhook(tenant.id, body).catch((err) =>
    console.error("[WHATSAPP][ERROR] wa-inbox persist:", err)
  );

  const seenConversations = new Set<string>();
  if (normalized.messages.length === 0) {
    console.log("[WHATSAPP][DEBUG] no text messages in payload (only statuses or non-text)");
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

    console.info(`[WHATSAPP] inbound tenant=${tenant.id} wa_id=${msg.from} type=${msg.type} msg_id=${msg.id}`);

    const key = `${tenant.id}:${msg.from}`;
    const isNewConversation = !seenConversations.has(key);
    seenConversations.add(key);

    const prep = await prepareInboundConversation({
      tenant,
      message: msg,
      isNewConversation,
    });
    if (!prep) {
      console.warn("[WHATSAPP][DEBUG] prepareInboundConversation returned null", { msgId: msg.id });
      continue;
    }

    const aiReady = await checkTenantAiAutomationReady(tenant.id, msg.from);
    if (aiReady.ready) {
      console.log("[WHATSAPP][DEBUG] using AI path", { msgId: msg.id });
      void runTenantAiAutoReply({
        tenant,
        message: msg,
        conversationId: prep.conversationId,
        textBody: prep.textBody,
      }).catch((err) => console.error("[WHATSAPP][ERROR] IA automática:", err));
    } else {
      console.log("[WHATSAPP][DEBUG] using legacy path", { msgId: msg.id, reason: aiReady.reason });
      await processLegacyInboundAutoReply(
        tenant,
        msg,
        prep.conversationId,
        prep.textBody
      );
    }
  }

  console.log("[WHATSAPP][DEBUG] webhook POST completed successfully");
  return NextResponse.json({ ok: true }, { status: 200 });
}
