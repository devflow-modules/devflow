import { NextResponse } from "next/server";
import { prisma } from "@/modules/financeiro/lib/db";
import { persistWebhookEvents } from "@/modules/whatsapp-inbox";
import { metaWebhookBodySchema, webhookVerificationQuerySchema } from "./whatsappWebhook.schemas";
import { parseInboundWebhookBody, verifyWebhookSubscription } from "./whatsappWebhook.service";
import type { IncomingMessage } from "@/modules/whatsapp-legacy/webhookHandler";
import { handleIncomingMessage } from "@/modules/whatsapp-legacy/webhookHandler";

export function handleWebhookVerificationGet(searchParams: URLSearchParams): NextResponse {
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = webhookVerificationQuerySchema.safeParse(raw);
  const mode = parsed.success ? parsed.data["hub.mode"] : raw["hub.mode"];
  const verifyToken = parsed.success ? parsed.data["hub.verify_token"] : raw["hub.verify_token"];
  const challenge = parsed.success ? parsed.data["hub.challenge"] : raw["hub.challenge"];

  const result = verifyWebhookSubscription({
    mode,
    verifyToken,
    challenge,
    expectedVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status });
  }

  return new NextResponse(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * Processa POST: sempre 200 para a Meta (evita retries em massa); erros só em log.
 */
export async function handleWebhookEventsPost(body: unknown): Promise<NextResponse> {
  const safe = metaWebhookBodySchema.safeParse(body);
  const payload = safe.success ? safe.data : body;

  const { events, parseError } = parseInboundWebhookBody(payload);

  if (parseError) {
    console.warn("[whatsapp-webhook] inbound parse note:", parseError);
  }

  try {
    await persistWebhookEvents(prisma, events);
  } catch (e) {
    console.error("[whatsapp-webhook] persistWebhookEvents", e);
  }

  const textMessages: IncomingMessage[] = [];
  for (const ev of events) {
    if (ev.kind === "message" && ev.type === "text" && ev.rawMessage) {
      const m = ev.rawMessage;
      if (typeof m.from === "string") {
        textMessages.push({
          from: m.from,
          type: "text",
          text: m.text?.body ? { body: m.text.body } : undefined,
        });
      }
    }
  }

  for (const msg of textMessages) {
    try {
      await handleIncomingMessage(msg);
    } catch (e) {
      console.error("[whatsapp-webhook] handleIncomingMessage error", e);
    }
  }

  return NextResponse.json({ received: true, events: events.length }, { status: 200 });
}
