-- CreateTable
CREATE TABLE "FinanceiroLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceiroLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceiroLead_source_idx" ON "FinanceiroLead"("source");

-- CreateIndex
CREATE INDEX "FinanceiroLead_createdAt_idx" ON "FinanceiroLead"("createdAt");
