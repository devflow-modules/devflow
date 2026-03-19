-- Usage-based billing: events, subscription mirror, monthly aggregates

CREATE TYPE "UsageEventType" AS ENUM ('MESSAGE_SENT', 'AI_RESPONSE');

CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "UsageEventType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_events_tenant_id_created_at_idx" ON "usage_events"("tenant_id", "created_at" DESC);
CREATE INDEX "usage_events_tenant_id_type_created_at_idx" ON "usage_events"("tenant_id", "type", "created_at");

ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "billing_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_subscriptions_tenant_id_key" ON "billing_subscriptions"("tenant_id");
CREATE UNIQUE INDEX "billing_subscriptions_stripe_subscription_id_key" ON "billing_subscriptions"("stripe_subscription_id");
CREATE INDEX "billing_subscriptions_stripe_customer_id_idx" ON "billing_subscriptions"("stripe_customer_id");

ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "usage_aggregates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "messages_count" INTEGER NOT NULL DEFAULT 0,
    "ai_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_aggregates_tenant_id_period_key" ON "usage_aggregates"("tenant_id", "period");
CREATE INDEX "usage_aggregates_tenant_id_period_idx" ON "usage_aggregates"("tenant_id", "period");

ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
