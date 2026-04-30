-- Referência opcional ao registo outbound_leads.id no BD do portal (cross-database; sem FK).
ALTER TABLE "wa_inbox_threads" ADD COLUMN "outbound_lead_id" VARCHAR(40);

CREATE INDEX "wa_inbox_threads_tenant_id_outbound_lead_id_idx" ON "wa_inbox_threads" ("tenant_id", "outbound_lead_id");
