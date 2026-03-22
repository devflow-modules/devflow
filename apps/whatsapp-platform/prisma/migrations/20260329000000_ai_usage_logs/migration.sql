-- AI analytics: per-tenant usage logs for cost/performance visibility

CREATE TYPE "AiUsageLogType" AS ENUM ('MESSAGE_TOTAL', 'AI_SUCCESS', 'AI_FALLBACK');

CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "AiUsageLogType" NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_logs_tenant_id_created_at_idx" ON "ai_usage_logs"("tenant_id", "created_at" DESC);
CREATE INDEX "ai_usage_logs_tenant_id_type_idx" ON "ai_usage_logs"("tenant_id", "type");

ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
