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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = normalizeWebhookPayload(body);
  if (!normalized) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  trackWebhookReceived();

  const tenant = await resolveTenantByPhoneNumberId(normalized.phoneNumberId).catch((err) => {
    console.error("[WHATSAPP][ERROR] tenant resolution:", err);
    return null;
  });
  if (!tenant) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (hasSupabaseConfig()) {
    await persistWebhookLog(body, tenant.id).catch((err) =>
      console.error("[WHATSAPP][ERROR] webhook log insert:", err)
    );
  }

  await persistWaInboxFromWebhook(tenant.id, body).catch((err) =>
    console.error("[WHATSAPP][ERROR] wa-inbox persist:", err)
  );

  const seenConversations = new Set<string>();
  for (const msg of normalized.messages) {
    if (msg.type !== "text") continue;
    const textBody = (msg as IncomingTextMessage).text?.body;
    if (!textBody?.trim()) continue;

    console.info(`[WHATSAPP] inbound tenant=${tenant.id} wa_id=${msg.from} type=${msg.type} msg_id=${msg.id}`);

    const key = `${tenant.id}:${msg.from}`;
    const isNewConversation = !seenConversations.has(key);
    seenConversations.add(key);

    const prep = await prepareInboundConversation({
      tenant,
      message: msg,
      isNewConversation,
    });
    if (!prep) continue;

    const aiReady = await checkTenantAiAutomationReady(tenant.id, msg.from);
    if (aiReady.ready) {
      void runTenantAiAutoReply({
        tenant,
        message: msg,
        conversationId: prep.conversationId,
        textBody: prep.textBody,
      }).catch((err) => console.error("[WHATSAPP][ERROR] IA automática:", err));
    } else {
      await processLegacyInboundAutoReply(
        tenant,
        msg,
        prep.conversationId,
        prep.textBody
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
