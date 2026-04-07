/**
 * Stripe Webhook — POST /api/stripe/webhook
 *
 * Responsabilidades:
 * - Validar assinatura (constructEvent)
 * - Garantir idempotência por event.id
 * - Rotear para billingWebhookService
 * - Retornar 200/400/500 conforme especificação
 *
 * Raw body obrigatório (Next.js App Router não usa bodyParser).
 * Valida assinatura com WHATSAPP_STRIPE_WEBHOOK_SECRET.
 */

import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { validateWebhook } from "@/modules/stripe/stripeWebhook";
import { ensureWebhookIdempotency } from "@/modules/billing/infrastructure/billingRepository";
import { handleStripeWebhookEvent, resolveTenantId } from "@/modules/billing/billingWebhookService";
import { parseWebhookEvent } from "@/modules/stripe/stripeWebhook";
import {
  logStripeEvent,
  logSystemError,
} from "@/modules/billing/billingObserverService";
import { logWebhookInvalidSignature } from "@/modules/stripe/webhookLogger";
import { recordPlatformAudit } from "@/lib/platformAuditLog";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // --- 1. Segurança: validar assinatura ---
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Webhook Error", { status: 400 });
  }

  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return new Response("Webhook Error", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = validateWebhook(signature, payload) as Stripe.Event;
  } catch (err) {
    logWebhookInvalidSignature(err);
    return new Response("Webhook Error", { status: 400 });
  }

  // --- 2. Idempotência: não processar event.id duplicado ---
  const isNew = await ensureWebhookIdempotency(event.id, event.type);
  if (!isNew) {
    return new Response("OK", { status: 200 });
  }

  const parsed = parseWebhookEvent(event);
  const tenantId = parsed?.tenantId ?? (await resolveTenantId(parsed)) ?? null;
  logStripeEvent(event, tenantId);

  // --- 3. Roteamento: delegar para service ---
  try {
    await handleStripeWebhookEvent(event);
    recordPlatformAudit({
      action: "billing_webhook_processed",
      tenantId: tenantId ?? undefined,
      resourceType: "stripe_event",
      resourceId: event.id,
      metadata: { eventType: event.type },
    });
  } catch (err) {
    if (tenantId) {
      logSystemError({
        tenantId,
        context: "webhook.handler",
        error: err,
        metadata: { eventType: event.type, eventId: event.id },
      });
    }
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
