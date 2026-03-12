import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage } from "@/modules/whatsapp";

/**
 * Webhook WhatsApp Cloud API
 *
 * GET  - Verificação (Meta envia hub.mode, hub.verify_token, hub.challenge)
 * POST - Eventos (mensagens recebidas)
 *
 * URL: https://devflowlabs.com.br/api/webhook/whatsapp
 * Ou: https://api.devflowlabs.com.br/webhook/whatsapp (se usar API separada)
 */

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
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

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // WhatsApp envia eventos em entry[].changes[].value
    if (body.object !== "whatsapp_business_account") {
      return new NextResponse(null, { status: 200 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes ?? [];

    for (const change of changes) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const messages = value?.messages ?? [];

      for (const msg of messages) {
        const from = msg.from;
        const type = msg.type ?? "text";
        const text = msg.text;

        await handleIncomingMessage({
          from,
          type,
          text: text ? { body: text.body } : undefined,
        });
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("[Webhook WhatsApp] Erro:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
