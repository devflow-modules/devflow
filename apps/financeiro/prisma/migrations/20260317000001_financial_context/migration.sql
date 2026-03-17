-- Migration: adiciona FinancialContext (PERSONAL | BUSINESS | SHARED) em Income e Expense
-- Idempotente: usa IF NOT EXISTS / DO $$ para colunas existentes

-- 1. Criar o enum (idempotente)
DO $$ BEGIN
  CREATE TYPE "FinancialContext" AS ENUM ('PERSONAL', 'BUSINESS', 'SHARED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar context em Income
DO $$ BEGIN
  ALTER TABLE "Income" ADD COLUMN "context" "FinancialContext" NOT NULL DEFAULT 'PERSONAL';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 3. Adicionar context em Expense
DO $$ BEGIN
  ALTER TABLE "Expense" ADD COLUMN "context" "FinancialContext" NOT NULL DEFAULT 'PERSONAL';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 4. Índices para filtros por contexto e data
CREATE INDEX IF NOT EXISTS "Income_householdId_context_idx" ON "Income"("householdId", "context");
CREATE INDEX IF NOT EXISTS "Expense_householdId_context_idx" ON "Expense"("householdId", "context");
CREATE INDEX IF NOT EXISTS "Expense_householdId_dueDate_idx" ON "Expense"("householdId", "dueDate");
CREATE INDEX IF NOT EXISTS "Expense_householdId_isRecurring_idx" ON "Expense"("householdId", "isRecurring");
