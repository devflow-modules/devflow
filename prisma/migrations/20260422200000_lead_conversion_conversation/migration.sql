-- Leads: conversão comercial e vínculo com conversa (ponte leve)

ALTER TABLE "outbound_leads" ADD COLUMN "convertedAt" TIMESTAMP(3);
ALTER TABLE "outbound_leads" ADD COLUMN "convertedToType" TEXT;
ALTER TABLE "outbound_leads" ADD COLUMN "convertedToRef" TEXT;
ALTER TABLE "outbound_leads" ADD COLUMN "conversationRef" TEXT;

CREATE INDEX "outbound_leads_convertedAt_idx" ON "outbound_leads"("convertedAt");
CREATE INDEX "outbound_leads_conversationRef_idx" ON "outbound_leads"("conversationRef");
