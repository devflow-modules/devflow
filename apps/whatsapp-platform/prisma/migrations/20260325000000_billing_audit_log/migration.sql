-- BillingAuditLog: observabilidade, auditoria e rastreabilidade do billing
CREATE TABLE "billing_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "reference_id" VARCHAR(256),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "billing_audit_logs_tenant_id_created_at_idx" ON "billing_audit_logs"("tenant_id", "created_at" DESC);
CREATE INDEX "billing_audit_logs_source_event_type_idx" ON "billing_audit_logs"("source", "event_type");
CREATE UNIQUE INDEX "billing_audit_logs_ref_event_type_key" ON "billing_audit_logs"("reference_id", "event_type") WHERE "reference_id" IS NOT NULL;

ALTER TABLE "billing_audit_logs" ADD CONSTRAINT "billing_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
