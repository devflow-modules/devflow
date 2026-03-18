-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fromParticipantId" TEXT NOT NULL,
    "toParticipantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Settlement_accountId_idx" ON "Settlement"("accountId");
CREATE INDEX "Settlement_fromParticipantId_idx" ON "Settlement"("fromParticipantId");
CREATE INDEX "Settlement_toParticipantId_idx" ON "Settlement"("toParticipantId");
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_fromParticipantId_fkey" FOREIGN KEY ("fromParticipantId") REFERENCES "AccountParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_toParticipantId_fkey" FOREIGN KEY ("toParticipantId") REFERENCES "AccountParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
