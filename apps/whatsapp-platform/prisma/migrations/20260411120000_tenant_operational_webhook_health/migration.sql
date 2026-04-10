-- Tenant operational controls + webhook health tracking

CREATE TABLE "tenant_operational_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "automation_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" VARCHAR(128),

    CONSTRAINT "tenant_operational_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_operational_configs_tenant_id_key" ON "tenant_operational_configs"("tenant_id");

ALTER TABLE "tenant_operational_configs" ADD CONSTRAINT "tenant_operational_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhook_health" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "last_received_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_error_at" TIMESTAMP(3),
    "total_received" INTEGER NOT NULL DEFAULT 0,
    "total_errors" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_health_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_health_tenant_id_key" ON "webhook_health"("tenant_id");

ALTER TABLE "webhook_health" ADD CONSTRAINT "webhook_health_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
