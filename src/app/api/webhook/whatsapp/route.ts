import { NextRequest, NextResponse } from "next/server";
import {
  handleWebhookVerification,
  handleWebhookEvents,
} from "@wa/modules/whatsapp/webhookHandler";

/**
 * Webhook WhatsApp Cloud API (runtime unificado no app raiz)
 *
 * GET  - Verificação Meta: hub.mode, hub.verify_token, hub.challenge
 * POST - Eventos: tenant resolution (WhatsappPhoneNumber), persist, IA, trackUsage
 *
 * URL pública: https://devflowlabs.com.br/api/webhook/whatsapp
 */

export async function GET(req: NextRequest) {
  return handleWebhookVerification(req);
}

export async function POST(req: NextRequest) {
  return handleWebhookEvents(req);
}
