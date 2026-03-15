-- DropForeignKey
ALTER TABLE "MarketingConsent" DROP CONSTRAINT "MarketingConsent_leadId_fkey";

-- DropForeignKey
ALTER TABLE "MarketingMessageSchedule" DROP CONSTRAINT "MarketingMessageSchedule_leadId_fkey";

-- DropIndex
DROP INDEX "PaymentDay_cycleId_idx";

-- AddForeignKey
ALTER TABLE "MarketingConsent" ADD CONSTRAINT "MarketingConsent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "MarketingLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingMessageSchedule" ADD CONSTRAINT "MarketingMessageSchedule_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "MarketingLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
