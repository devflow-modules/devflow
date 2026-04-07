-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(64) NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "resource_type" VARCHAR(64),
    "resource_id" VARCHAR(128),
    "metadata" JSONB,
    "ip" VARCHAR(128),

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_audit_logs_tenant_id_created_at_idx" ON "platform_audit_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_logs_action_created_at_idx" ON "platform_audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_logs_user_id_created_at_idx" ON "platform_audit_logs"("user_id", "created_at" DESC);
