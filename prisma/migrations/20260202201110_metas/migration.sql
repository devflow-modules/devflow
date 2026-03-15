-- CreateTable
CREATE TABLE "IncomeAllocationGoal" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "investmentPercent" DECIMAL(5,2),
    "savingsPercent" DECIMAL(5,2),
    "investmentAmount" DECIMAL(10,2),
    "savingsAmount" DECIMAL(10,2),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeAllocationGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncomeAllocationGoal_householdId_year_month_idx" ON "IncomeAllocationGoal"("householdId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeAllocationGoal_householdId_year_month_key" ON "IncomeAllocationGoal"("householdId", "year", "month");

-- AddForeignKey
ALTER TABLE "IncomeAllocationGoal" ADD CONSTRAINT "IncomeAllocationGoal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
