import { NextRequest, NextResponse } from "next/server";
import { registrarUsuarioViaCompra } from "@/modules/webhooks";
import { trackWebhookReceived, trackWebhookUserCreated } from "@/modules/analytics";

export async function POST(request: NextRequest) {
  trackWebhookReceived();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = await registrarUsuarioViaCompra(body as Parameters<typeof registrarUsuarioViaCompra>[0]);
  if (result.created) trackWebhookUserCreated();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, created: result.created });
}
