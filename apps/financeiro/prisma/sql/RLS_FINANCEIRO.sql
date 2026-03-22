-- ============================================================================
-- RLS_FINANCEIRO.sql — Row Level Security (Supabase + schema Prisma real)
-- ============================================================================
-- Schema de referência: apps/financeiro/prisma/migrations/*.sql
--
-- Tabela de vínculo usuário ↔ casa: "HouseholdMembership"
--   Colunas: "userId", "householdId" (TEXT / cuid, não UUID)
-- Usuário Supabase: "User"."supabaseId" = auth.uid()::text
--
-- ⚠️  O app Next.js usa Prisma com role normalmente OWNER das tabelas —
--     em PostgreSQL o dono ignora RLS (salvo FORCE ROW LEVEL SECURITY).
--     Estas policies valem para: Supabase Client (anon/authenticated),
--     Edge Functions, ou conexões com role que não seja owner.
--
-- Ordem: função helper → ENABLE RLS → policies (SELECT/INSERT/UPDATE/DELETE)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper: membro do household (JWT Supabase → User → HouseholdMembership)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_household_member(target_household_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "HouseholdMembership" hm
      INNER JOIN "User" u ON u.id = hm."userId"
      WHERE hm."householdId" = target_household_id
        AND u."supabaseId" IS NOT NULL
        AND u."supabaseId" = (auth.uid())::text
    );
$$;

COMMENT ON FUNCTION public.is_household_member(text) IS
  'True se o usuário autenticado (JWT) é membro do household. Usa "HouseholdMembership" + "User".supabaseId.';

GRANT EXECUTE ON FUNCTION public.is_household_member(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_member(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_household_member(text) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Remover policies antigas (idempotente) e habilitar RLS
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'Account',
        'AccountParticipant',
        'Expense',
        'ExpenseSplit',
        'Settlement',
        'Payment',
        'PaymentReversal',
        'AccountSnapshot',
        'IdempotencyRecord'
      )
      AND policyname LIKE 'fin_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseSplit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentReversal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyRecord" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) Account (householdId direto)
-- ---------------------------------------------------------------------------
CREATE POLICY fin_account_select ON "Account"
  FOR SELECT TO authenticated
  USING (public.is_household_member("householdId"));

CREATE POLICY fin_account_insert ON "Account"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member("householdId"));

CREATE POLICY fin_account_update ON "Account"
  FOR UPDATE TO authenticated
  USING (public.is_household_member("householdId"))
  WITH CHECK (public.is_household_member("householdId"));

CREATE POLICY fin_account_delete ON "Account"
  FOR DELETE TO authenticated
  USING (public.is_household_member("householdId"));

-- ---------------------------------------------------------------------------
-- 4) AccountParticipant → Account.householdId
-- ---------------------------------------------------------------------------
CREATE POLICY fin_acct_part_select ON "AccountParticipant"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountParticipant"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_acct_part_insert ON "AccountParticipant"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountParticipant"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_acct_part_update ON "AccountParticipant"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountParticipant"."accountId"
        AND public.is_household_member(a."householdId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountParticipant"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_acct_part_delete ON "AccountParticipant"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountParticipant"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Expense (householdId em toda linha)
-- ---------------------------------------------------------------------------
CREATE POLICY fin_expense_select ON "Expense"
  FOR SELECT TO authenticated
  USING (public.is_household_member("householdId"));

CREATE POLICY fin_expense_insert ON "Expense"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member("householdId"));

CREATE POLICY fin_expense_update ON "Expense"
  FOR UPDATE TO authenticated
  USING (public.is_household_member("householdId"))
  WITH CHECK (public.is_household_member("householdId"));

CREATE POLICY fin_expense_delete ON "Expense"
  FOR DELETE TO authenticated
  USING (public.is_household_member("householdId"));

-- ---------------------------------------------------------------------------
-- 6) ExpenseSplit → Expense.householdId
-- ---------------------------------------------------------------------------
CREATE POLICY fin_split_select ON "ExpenseSplit"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "ExpenseSplit"."expenseId"
        AND public.is_household_member(e."householdId")
    )
  );

CREATE POLICY fin_split_insert ON "ExpenseSplit"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "ExpenseSplit"."expenseId"
        AND public.is_household_member(e."householdId")
    )
  );

CREATE POLICY fin_split_update ON "ExpenseSplit"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "ExpenseSplit"."expenseId"
        AND public.is_household_member(e."householdId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "ExpenseSplit"."expenseId"
        AND public.is_household_member(e."householdId")
    )
  );

CREATE POLICY fin_split_delete ON "ExpenseSplit"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "ExpenseSplit"."expenseId"
        AND public.is_household_member(e."householdId")
    )
  );

-- ---------------------------------------------------------------------------
-- 7) Settlement → Account.householdId
-- ---------------------------------------------------------------------------
CREATE POLICY fin_settlement_select ON "Settlement"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "Settlement"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_settlement_insert ON "Settlement"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "Settlement"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_settlement_update ON "Settlement"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "Settlement"."accountId"
        AND public.is_household_member(a."householdId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "Settlement"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_settlement_delete ON "Settlement"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "Settlement"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

-- ---------------------------------------------------------------------------
-- 8) Payment → Settlement → Account
-- ---------------------------------------------------------------------------
CREATE POLICY fin_payment_select ON "Payment"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Settlement" s
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE s.id = "Payment"."settlementId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_payment_insert ON "Payment"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Settlement" s
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE s.id = "Payment"."settlementId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_payment_update ON "Payment"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Settlement" s
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE s.id = "Payment"."settlementId"
        AND public.is_household_member(a."householdId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Settlement" s
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE s.id = "Payment"."settlementId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_payment_delete ON "Payment"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Settlement" s
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE s.id = "Payment"."settlementId"
        AND public.is_household_member(a."householdId")
    )
  );

-- ---------------------------------------------------------------------------
-- 9) PaymentReversal → Payment → Settlement → Account
-- ---------------------------------------------------------------------------
CREATE POLICY fin_reversal_select ON "PaymentReversal"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Payment" p
      INNER JOIN "Settlement" s ON s.id = p."settlementId"
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE p.id = "PaymentReversal"."paymentId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_reversal_insert ON "PaymentReversal"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Payment" p
      INNER JOIN "Settlement" s ON s.id = p."settlementId"
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE p.id = "PaymentReversal"."paymentId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_reversal_update ON "PaymentReversal"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Payment" p
      INNER JOIN "Settlement" s ON s.id = p."settlementId"
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE p.id = "PaymentReversal"."paymentId"
        AND public.is_household_member(a."householdId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Payment" p
      INNER JOIN "Settlement" s ON s.id = p."settlementId"
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE p.id = "PaymentReversal"."paymentId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_reversal_delete ON "PaymentReversal"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Payment" p
      INNER JOIN "Settlement" s ON s.id = p."settlementId"
      INNER JOIN "Account" a ON a.id = s."accountId"
      WHERE p.id = "PaymentReversal"."paymentId"
        AND public.is_household_member(a."householdId")
    )
  );

-- ---------------------------------------------------------------------------
-- 10) AccountSnapshot → Account
-- ---------------------------------------------------------------------------
CREATE POLICY fin_snapshot_select ON "AccountSnapshot"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountSnapshot"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_snapshot_insert ON "AccountSnapshot"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountSnapshot"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_snapshot_update ON "AccountSnapshot"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountSnapshot"."accountId"
        AND public.is_household_member(a."householdId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountSnapshot"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

CREATE POLICY fin_snapshot_delete ON "AccountSnapshot"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountSnapshot"."accountId"
        AND public.is_household_member(a."householdId")
    )
  );

-- ---------------------------------------------------------------------------
-- 11) IdempotencyRecord (householdId direto)
-- ---------------------------------------------------------------------------
CREATE POLICY fin_idem_select ON "IdempotencyRecord"
  FOR SELECT TO authenticated
  USING (public.is_household_member("householdId"));

CREATE POLICY fin_idem_insert ON "IdempotencyRecord"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member("householdId"));

CREATE POLICY fin_idem_update ON "IdempotencyRecord"
  FOR UPDATE TO authenticated
  USING (public.is_household_member("householdId"))
  WITH CHECK (public.is_household_member("householdId"));

CREATE POLICY fin_idem_delete ON "IdempotencyRecord"
  FOR DELETE TO authenticated
  USING (public.is_household_member("householdId"));

-- ============================================================================
-- Grants para role authenticated (consultas via PostgREST / Supabase client)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "Account" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "AccountParticipant" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Expense" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ExpenseSplit" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Settlement" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Payment" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PaymentReversal" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "AccountSnapshot" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "IdempotencyRecord" TO authenticated;

-- Se as tabelas já tinham GRANT só para postgres, ajuste conforme seu modelo de acesso.
