-- Migration: adiciona recurrenceParentId em Expense e Income para rastrear instâncias de recorrência

-- Expense
DO $$ BEGIN
  ALTER TABLE "Expense" ADD COLUMN "recurrenceParentId" TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

ALTER TABLE "Expense"
  DROP CONSTRAINT IF EXISTS "Expense_recurrenceParentId_fkey";

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_recurrenceParentId_fkey"
  FOREIGN KEY ("recurrenceParentId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Expense_recurrenceParentId_idx" ON "Expense"("recurrenceParentId");

-- Income
DO $$ BEGIN
  ALTER TABLE "Income" ADD COLUMN "recurrenceParentId" TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

ALTER TABLE "Income"
  DROP CONSTRAINT IF EXISTS "Income_recurrenceParentId_fkey";

ALTER TABLE "Income"
  ADD CONSTRAINT "Income_recurrenceParentId_fkey"
  FOREIGN KEY ("recurrenceParentId") REFERENCES "Income"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Income_recurrenceParentId_idx" ON "Income"("recurrenceParentId");
