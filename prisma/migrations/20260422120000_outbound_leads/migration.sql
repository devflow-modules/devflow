-- CRM mínimo: leads outbound manuais (admin portal)

CREATE TABLE "outbound_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbound_leads_status_createdAt_idx" ON "outbound_leads"("status", "createdAt" DESC);
CREATE INDEX "outbound_leads_createdAt_idx" ON "outbound_leads"("createdAt" DESC);
