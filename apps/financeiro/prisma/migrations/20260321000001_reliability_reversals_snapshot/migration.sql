-- IdempotencyRecord
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdempotencyRecord_householdId_key_key" ON "IdempotencyRecord"("householdId", "key");
CREATE INDEX "IdempotencyRecord_householdId_idx" ON "IdempotencyRecord"("householdId");
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentReversal
CREATE TABLE "PaymentReversal" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentReversal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentReversal_paymentId_idx" ON "PaymentReversal"("paymentId");
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AccountSnapshot
CREATE TABLE "AccountSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "balances" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountSnapshot_accountId_month_key" ON "AccountSnapshot"("accountId", "month");
CREATE INDEX "AccountSnapshot_accountId_idx" ON "AccountSnapshot"("accountId");
ALTER TABLE "AccountSnapshot" ADD CONSTRAINT "AccountSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Settlement" ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3);
