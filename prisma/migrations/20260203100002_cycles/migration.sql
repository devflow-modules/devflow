-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('MONTHLY', 'WEEKLY');

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycleType" "CycleType" NOT NULL DEFAULT 'MONTHLY',
    "anchorDay" INTEGER,
    "anchorWeekDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cycle_householdId_idx" ON "Cycle"("householdId");

-- AddForeignKey
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable PaymentDay: add cycleId
ALTER TABLE "PaymentDay" ADD COLUMN "cycleId" TEXT;

-- CreateIndex
CREATE INDEX "PaymentDay_cycleId_idx" ON "PaymentDay"("cycleId");

-- AddForeignKey
ALTER TABLE "PaymentDay" ADD CONSTRAINT "PaymentDay_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
