-- CreateEnum (idempotent: skip if AiUsageLogType already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiUsageLogType') THEN
        CREATE TYPE "AiUsageLogType" AS ENUM ('MESSAGE_TOTAL', 'AI_SUCCESS', 'AI_FALLBACK');
    END IF;
END
$$;

-- CreateTable (idempotent: skip if ai_usage_logs already exists)
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "AiUsageLogType" NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_usage_logs_tenant_id_created_at_idx" ON "ai_usage_logs"("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ai_usage_logs_tenant_id_type_idx" ON "ai_usage_logs"("tenant_id", "type");

-- AddForeignKey (only if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ai_usage_logs_tenant_id_fkey'
    ) THEN
        ALTER TABLE "ai_usage_logs"
        ADD CONSTRAINT "ai_usage_logs_tenant_id_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
