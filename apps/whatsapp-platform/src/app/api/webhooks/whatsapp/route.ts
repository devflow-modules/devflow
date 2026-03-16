import { NextRequest, NextResponse } from "next/server";
import { normalizeWebhookPayload, type IncomingTextMessage } from "@devflow/whatsapp-core";
import { APP_PRODUCT_SLUG } from "@/lib/constants";
import { resolveTenantByPhoneNumberId } from "@/modules/tenants/tenantService";
import { processInboundMessage, persistWebhookLog } from "@/modules/messaging/webhookProcessingService";
import { trackWebhookReceived } from "@/modules/analytics";
import { hasSupabaseConfig } from "@/lib/supabase-server";

/**
 * Webhook WhatsApp Cloud API.
 * GET  — Verificação (Meta: hub.mode, hub.verify_token, hub.challenge).
 * POST — Eventos: normalizar → resolver tenant → persistir log → processar mensagens → responder.
 */
export async function GET(request: NextRequest) {
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

export async function POST(request: Request) {
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

  const tenant = await resolveTenantByPhoneNumberId(normalized.phoneNumberId).catch(() => null);
  if (!tenant) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (hasSupabaseConfig()) {
    await persistWebhookLog(body, tenant.id).catch((err) => console.error("[Webhook] log insert:", err));
  }

  const seenConversations = new Set<string>();
  for (const msg of normalized.messages) {
    if (msg.type !== "text") continue;
    const textBody = (msg as IncomingTextMessage).text?.body;
    if (!textBody) continue;
    const key = `${tenant.id}:${msg.from}`;
    const isNewConversation = !seenConversations.has(key);
    seenConversations.add(key);
    await processInboundMessage({
      tenant,
      message: msg,
      isNewConversation,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
