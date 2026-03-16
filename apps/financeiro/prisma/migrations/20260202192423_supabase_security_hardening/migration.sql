-- Supabase Security Hardening
-- Objetivo:
-- - Evitar exposição das tabelas do app via PostgREST (anon/authenticated)
-- - Habilitar RLS (Row Level Security) nas tabelas do app
-- Observação:
-- - O app acessa o banco via Prisma (server). Se você usa PostgREST diretamente,
--   adapte/adicione policies antes de conceder grants novamente.

-- 1) Revogar acesso a PostgREST roles
-- (não revogar _prisma_migrations: o Prisma precisa dela no shadow DB para migrate dev)
REVOKE ALL ON TABLE public."User" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Household" FROM anon, authenticated;
REVOKE ALL ON TABLE public."HouseholdMembership" FROM anon, authenticated;

REVOKE ALL ON TABLE public."Source" FROM anon, authenticated;
REVOKE ALL ON TABLE public."PaymentDay" FROM anon, authenticated;

REVOKE ALL ON TABLE public."Income" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Expense" FROM anon, authenticated;

REVOKE ALL ON TABLE public."Rule" FROM anon, authenticated;
REVOKE ALL ON TABLE public."RuleSource" FROM anon, authenticated;

REVOKE ALL ON TABLE public."Invite" FROM anon, authenticated;
-- IncomeAllocationGoal e AuditLog: ver 20260203100003_supabase_security_hardening_late

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Default privileges (para futuros objetos no schema public)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 2) Habilitar RLS nas tabelas do app
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Household" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HouseholdMembership" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."Source" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentDay" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."Income" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Expense" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."Rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RuleSource" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."Invite" ENABLE ROW LEVEL SECURITY;

