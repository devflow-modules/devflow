-- AlterEnum: add PARTIAL to SettlementStatus
ALTER TYPE "SettlementStatus" ADD VALUE 'PARTIAL';

-- AlterTable Settlement: add paidAmount
ALTER TABLE "Settlement" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
UPDATE "Settlement" SET "paidAmount" = "amount" WHERE "status" = 'COMPLETED';

-- CreateTable Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_settlementId_idx" ON "Payment"("settlementId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
