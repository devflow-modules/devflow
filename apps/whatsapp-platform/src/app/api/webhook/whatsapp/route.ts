/**
 * Webhook WhatsApp Cloud API — URL canônica para Meta.
 * Meta → https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp (host do deploy `whatsapp-platform`)
 *
 * GET  — Verificação (hub.mode, hub.verify_token, hub.challenge).
 * POST — Eventos: tenant resolution, persistência, IA, billing.
 */

import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { handleWebhookVerification, handleWebhookEvents } from "@/modules/whatsapp/webhookHandler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleWebhookVerification(request);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const lim = checkRateLimit(ip, "webhook-whatsapp");
  if (!lim.ok) {
    return jsonError("RATE_LIMITED", "Too many requests", 429, {
      headers: lim.retryAfter ? { "Retry-After": String(lim.retryAfter) } : undefined,
    });
  }
  return handleWebhookEvents(request);
}
