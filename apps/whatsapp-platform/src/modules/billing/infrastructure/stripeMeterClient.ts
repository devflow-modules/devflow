/**
 * Stripe Billing Meter Events API.
 * Replaces legacy subscriptionItems.createUsageRecord().
 *
 * Backend envia apenas event_name; price_id NÃO é passado.
 * O meter no Stripe está vinculado ao price → Stripe converte evento em cobrança.
 *
 * Event names: whatsapp_messages, ai_usage, ai_responses (overage)
 */

import { getStripe } from "@/modules/stripe/stripeClient";

export const METER_EVENT_MESSAGES = "whatsapp_messages" as const;
export const METER_EVENT_AI = "ai_usage" as const;
/** Usado para cobrança de excedente de IA (Pro/Scale). Meter deve estar configurado no Stripe. */
export const METER_EVENT_AI_RESPONSES = "ai_responses" as const;

export function isMeterEventsConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_STRIPE_METERED_PRICE_MESSAGES ||
      process.env.WHATSAPP_STRIPE_METERED_PRICE_AI ||
      process.env.WHATSAPP_STRIPE_TEST_METERED_PRICE_MESSAGES ||
      process.env.WHATSAPP_STRIPE_TEST_METERED_PRICE_AI
  );
}

export type MeterEventName =
  | typeof METER_EVENT_MESSAGES
  | typeof METER_EVENT_AI
  | typeof METER_EVENT_AI_RESPONSES;

export type CreateMeterEventParams = {
  eventName: MeterEventName;
  stripeCustomerId: string;
  value: number;
  timestamp?: number;
  identifier?: string;
};

export async function createMeterEvent(
  params: CreateMeterEventParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stripe = getStripe();
  const ts = params.timestamp ?? Math.floor(Date.now() / 1000);
  const prefix =
    params.eventName === METER_EVENT_MESSAGES
      ? "msg"
      : params.eventName === METER_EVENT_AI_RESPONSES
        ? "ai_resp"
        : "ai";
  const identifier =
    params.identifier ?? `${prefix}_${params.stripeCustomerId}_${Date.now()}`;

  try {
    await stripe.billing.meterEvents.create({
      event_name: params.eventName,
      payload: {
        stripe_customer_id: params.stripeCustomerId,
        value: String(params.value),
      },
      timestamp: ts,
      identifier: identifier.slice(0, 100),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}
