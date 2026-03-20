/**
 * Webhook WhatsApp Cloud API — URL canônica para Meta.
 * Meta → https://app.devflowlabs.com.br/api/webhook/whatsapp
 *
 * GET  — Verificação (hub.mode, hub.verify_token, hub.challenge).
 * POST — Eventos: tenant resolution, persistência, IA, billing.
 */

import { NextRequest } from "next/server";
import { handleWebhookVerification, handleWebhookEvents } from "@/modules/whatsapp/webhookHandler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleWebhookVerification(request);
}

export async function POST(request: Request) {
  return handleWebhookEvents(request);
}
