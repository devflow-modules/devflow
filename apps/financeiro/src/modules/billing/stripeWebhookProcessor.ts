import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/modules/financeiro/lib/db";
import {
  handleCheckoutCompleted,
  handleCustomerUpdated,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionCreatedOrUpdated,
  handleSubscriptionDeleted,
} from "./webhookHandlers";

function payloadForStore(event: Stripe.Event): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue;
}

/**
 * Idempotência + despacho. Stripe pode reenviar o mesmo event.id — retornamos sem reprocessar.
 */
export async function processStripeWebhookEventWithIdempotency(event: Stripe.Event): Promise<void> {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing?.processed) return;

  if (!existing) {
    try {
      await prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          payloadJson: payloadForStore(event),
          processed: false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await prisma.stripeWebhookEvent.findUnique({
          where: { stripeEventId: event.id },
        });
        if (again?.processed) return;
      } else {
        throw e;
      }
    }
  }

  try {
    await dispatchStripeEvent(event);
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { processed: true, processedAt: new Date(), errorMessage: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { errorMessage: message },
    });
    throw err;
  }
}

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionCreatedOrUpdated(event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await handleInvoicePaid(event);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event);
      break;
    case "customer.updated":
      await handleCustomerUpdated(event);
      break;
    default:
      break;
  }
}
