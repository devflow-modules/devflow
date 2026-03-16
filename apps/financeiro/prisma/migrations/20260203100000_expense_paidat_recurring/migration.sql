-- Add paidAt/isRecurring to Expense (MVP pagamento + recorrência)
ALTER TABLE "Expense"
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;

