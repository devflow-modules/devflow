-- Estado operacional onboarding WhatsApp Cloud API (sem segredos)
CREATE TABLE "WhatsappOnboardingState" (
    "id" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "businessId" TEXT,
    "codeRequestedAt" TIMESTAMP(3),
    "codeVerifiedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "lastMetaErrorCode" INTEGER,
    "lastMetaErrorMessage" VARCHAR(2000),
    "lastOperation" TEXT NOT NULL DEFAULT 'NONE',
    "lastOperationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappOnboardingState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappOnboardingState_wabaId_phoneNumberId_key" ON "WhatsappOnboardingState"("wabaId", "phoneNumberId");
CREATE INDEX "WhatsappOnboardingState_phoneNumberId_idx" ON "WhatsappOnboardingState"("phoneNumberId");
