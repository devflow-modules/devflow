-- CreateTable
CREATE TABLE "PersonalAllocationGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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

    CONSTRAINT "PersonalAllocationGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAllocationGoal_userId_householdId_year_month_key" ON "PersonalAllocationGoal"("userId", "householdId", "year", "month");

-- CreateIndex
CREATE INDEX "PersonalAllocationGoal_householdId_year_month_idx" ON "PersonalAllocationGoal"("householdId", "year", "month");

-- CreateIndex
CREATE INDEX "PersonalAllocationGoal_userId_householdId_year_month_idx" ON "PersonalAllocationGoal"("userId", "householdId", "year", "month");

-- AddForeignKey
ALTER TABLE "PersonalAllocationGoal" ADD CONSTRAINT "PersonalAllocationGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalAllocationGoal" ADD CONSTRAINT "PersonalAllocationGoal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
