-- Interno: tenant de comercial / DevFlow (workspace próprio) vs cliente padrão.
ALTER TABLE "whatsapp_tenants" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "whatsapp_tenants_is_internal_idx" ON "whatsapp_tenants"("is_internal");
