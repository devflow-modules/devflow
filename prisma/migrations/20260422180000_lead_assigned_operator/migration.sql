-- Propriedade de lead: operador responsável (id em whatsapp_users, validado na API)
ALTER TABLE "outbound_leads" ADD COLUMN "assigned_operator_id" TEXT;

CREATE INDEX "outbound_leads_assigned_operator_id_idx" ON "outbound_leads"("assigned_operator_id");
