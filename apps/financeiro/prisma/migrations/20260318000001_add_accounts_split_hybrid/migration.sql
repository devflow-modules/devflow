-- CreateEnum
CREATE TYPE "ExpenseSplitType" AS ENUM ('SHARED', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialContext" NOT NULL DEFAULT 'PERSONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountParticipant" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultShare" DECIMAL(5,4) NOT NULL,
    "userId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- AlterTable Expense: add accountId, expenseSplitType, paidByParticipantId
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "expenseSplitType" "ExpenseSplitType" NOT NULL DEFAULT 'SHARED';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paidByParticipantId" TEXT;

-- CreateIndex
CREATE INDEX "Account_householdId_idx" ON "Account"("householdId");
CREATE INDEX "AccountParticipant_accountId_idx" ON "AccountParticipant"("accountId");
CREATE INDEX "AccountParticipant_userId_idx" ON "AccountParticipant"("userId");
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_participantId_key" ON "ExpenseSplit"("expenseId", "participantId");
CREATE INDEX "ExpenseSplit_expenseId_idx" ON "ExpenseSplit"("expenseId");
CREATE INDEX "ExpenseSplit_participantId_idx" ON "ExpenseSplit"("participantId");
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountParticipant" ADD CONSTRAINT "AccountParticipant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "AccountParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByParticipantId_fkey" FOREIGN KEY ("paidByParticipantId") REFERENCES "AccountParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
