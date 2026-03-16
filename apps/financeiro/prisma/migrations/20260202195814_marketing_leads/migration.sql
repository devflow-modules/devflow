-- Marketing Leads / Consent / Events / Message Schedule

CREATE TYPE "MarketingChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "MarketingMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "MarketingLead" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "whatsapp" TEXT,
  "goal" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "landingPath" TEXT,
  "referrer" TEXT,
  "consentEmail" BOOLEAN NOT NULL DEFAULT false,
  "consentWhatsapp" BOOLEAN NOT NULL DEFAULT false,
  "consentTextVersion" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingLead_email_key" ON "MarketingLead"("email");
CREATE INDEX "MarketingLead_createdAt_idx" ON "MarketingLead"("createdAt");

CREATE TABLE "MarketingConsent" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "channel" "MarketingChannel" NOT NULL,
  "consentTextVersion" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingConsent_leadId_idx" ON "MarketingConsent"("leadId");

CREATE TABLE "MarketingEvent" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "userId" TEXT,
  "event" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingEvent_leadId_createdAt_idx" ON "MarketingEvent"("leadId", "createdAt");
CREATE INDEX "MarketingEvent_userId_createdAt_idx" ON "MarketingEvent"("userId", "createdAt");

CREATE TABLE "MarketingMessageSchedule" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "channel" "MarketingChannel" NOT NULL,
  "templateKey" TEXT NOT NULL,
  "status" "MarketingMessageStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingMessageSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingMessageSchedule_leadId_idx" ON "MarketingMessageSchedule"("leadId");
CREATE INDEX "MarketingMessageSchedule_channel_status_scheduledFor_idx" ON "MarketingMessageSchedule"("channel", "status", "scheduledFor");
CREATE UNIQUE INDEX "MarketingMessageSchedule_leadId_channel_templateKey_key" ON "MarketingMessageSchedule"("leadId", "channel", "templateKey");

ALTER TABLE "MarketingConsent"
ADD CONSTRAINT "MarketingConsent_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "MarketingLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingEvent"
ADD CONSTRAINT "MarketingEvent_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "MarketingLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketingEvent"
ADD CONSTRAINT "MarketingEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketingMessageSchedule"
ADD CONSTRAINT "MarketingMessageSchedule_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "MarketingLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS + revoke (evita exposição via PostgREST)
REVOKE ALL ON TABLE public."MarketingLead" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MarketingConsent" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MarketingEvent" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MarketingMessageSchedule" FROM anon, authenticated;

ALTER TABLE public."MarketingLead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketingConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketingMessageSchedule" ENABLE ROW LEVEL SECURITY;

