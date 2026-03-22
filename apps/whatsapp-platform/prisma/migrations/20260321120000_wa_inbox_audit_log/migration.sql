-- CreateTable
CREATE TABLE "wa_inbox_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_inbox_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_inbox_audit_logs_tenant_id_thread_id_created_at_idx" ON "wa_inbox_audit_logs"("tenant_id", "thread_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wa_inbox_audit_logs_tenant_id_created_at_idx" ON "wa_inbox_audit_logs"("tenant_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "wa_inbox_audit_logs" ADD CONSTRAINT "wa_inbox_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
