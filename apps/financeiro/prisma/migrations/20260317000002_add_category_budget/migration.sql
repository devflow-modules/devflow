-- Migration: adiciona tabelas Category e Budget + campo categoryId em Expense
-- Idempotente

-- 1. Tabela Category
CREATE TABLE IF NOT EXISTS "Category" (
  "id"          TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "color"       TEXT NOT NULL DEFAULT '#6366f1',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Category_householdId_idx" ON "Category"("householdId");

ALTER TABLE "Category"
  DROP CONSTRAINT IF EXISTS "Category_householdId_fkey";

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Tabela Budget
CREATE TABLE IF NOT EXISTS "Budget" (
  "id"           TEXT NOT NULL,
  "householdId"  TEXT NOT NULL,
  "categoryId"   TEXT NOT NULL,
  "monthlyLimit" DECIMAL(10,2) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Budget_householdId_categoryId_key" ON "Budget"("householdId", "categoryId");
CREATE INDEX IF NOT EXISTS "Budget_householdId_idx" ON "Budget"("householdId");

ALTER TABLE "Budget"
  DROP CONSTRAINT IF EXISTS "Budget_householdId_fkey";
ALTER TABLE "Budget"
  ADD CONSTRAINT "Budget_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Budget"
  DROP CONSTRAINT IF EXISTS "Budget_categoryId_fkey";
ALTER TABLE "Budget"
  ADD CONSTRAINT "Budget_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Campo categoryId em Expense (idempotente)
DO $$ BEGIN
  ALTER TABLE "Expense" ADD COLUMN "categoryId" TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

ALTER TABLE "Expense"
  DROP CONSTRAINT IF EXISTS "Expense_categoryId_fkey";

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
