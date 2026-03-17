-- Migration: adiciona tabela MonthSnapshot para fechamento mensal

CREATE TABLE IF NOT EXISTS "MonthSnapshot" (
  "id"              TEXT NOT NULL,
  "householdId"     TEXT NOT NULL,
  "year"            INTEGER NOT NULL,
  "month"           INTEGER NOT NULL,
  "totalIncomes"    DECIMAL(10,2) NOT NULL,
  "totalExpenses"   DECIMAL(10,2) NOT NULL,
  "balance"         DECIMAL(10,2) NOT NULL,
  "pendingExpenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "notes"           TEXT,
  "closedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthSnapshot_householdId_year_month_key"
  ON "MonthSnapshot"("householdId", "year", "month");

CREATE INDEX IF NOT EXISTS "MonthSnapshot_householdId_year_month_idx"
  ON "MonthSnapshot"("householdId", "year", "month");

ALTER TABLE "MonthSnapshot"
  DROP CONSTRAINT IF EXISTS "MonthSnapshot_householdId_fkey";

ALTER TABLE "MonthSnapshot"
  ADD CONSTRAINT "MonthSnapshot_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
