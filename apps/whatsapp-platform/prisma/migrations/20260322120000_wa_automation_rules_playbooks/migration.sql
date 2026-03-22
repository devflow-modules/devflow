-- CreateTable
CREATE TABLE "wa_automation_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "trigger_type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_automation_playbooks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_automation_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_automation_rules_tenant_id_is_active_trigger_type_idx" ON "wa_automation_rules"("tenant_id", "is_active", "trigger_type");

-- CreateIndex
CREATE INDEX "wa_automation_playbooks_tenant_id_is_active_idx" ON "wa_automation_playbooks"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "wa_automation_rules" ADD CONSTRAINT "wa_automation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_automation_playbooks" ADD CONSTRAINT "wa_automation_playbooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
