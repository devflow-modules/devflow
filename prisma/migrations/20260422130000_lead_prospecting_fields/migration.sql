-- Leads outbound: origem, último contato, próximo follow-up

ALTER TABLE "outbound_leads" ADD COLUMN "origin" TEXT;
ALTER TABLE "outbound_leads" ADD COLUMN "lastContactAt" TIMESTAMP(3);
ALTER TABLE "outbound_leads" ADD COLUMN "nextFollowUpAt" TIMESTAMP(3);

CREATE INDEX "outbound_leads_nextFollowUpAt_idx" ON "outbound_leads"("nextFollowUpAt");
CREATE INDEX "outbound_leads_origin_idx" ON "outbound_leads"("origin");
