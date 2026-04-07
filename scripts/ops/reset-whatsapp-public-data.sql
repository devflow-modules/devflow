-- =============================================================================
-- Reset de dados do WhatsApp Platform (Postgres / Supabase)
-- =============================================================================
-- Apaga TODOS os dados das tabelas em public.*, exceto _prisma_migrations.
-- Irreversível. Confirme que está no projeto/banco correto antes de executar.
--
-- Onde executar:
--   Supabase → SQL Editor → colar e Run
--   ou: psql "$WHATSAPP_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/ops/reset-whatsapp-public-data.sql
--
-- Não remove utilizadores em auth.users (schema auth). O signup da app usa
-- Prisma (whatsapp_users); após este script o e-mail deixa de estar "em uso".
-- =============================================================================

DO $$
DECLARE
  stmt text;
BEGIN
  SELECT
    'TRUNCATE TABLE '
    || string_agg(
      format('%I.%I', schemaname, tablename),
      ', '
      ORDER BY tablename
    )
    || ' RESTART IDENTITY CASCADE'
  INTO stmt
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> '_prisma_migrations';

  IF stmt IS NULL OR btrim(stmt) = 'TRUNCATE TABLE RESTART IDENTITY CASCADE' THEN
    RAISE NOTICE 'Nenhuma tabela em public para truncar (além de _prisma_migrations).';
    RETURN;
  END IF;

  RAISE NOTICE '%', stmt;
  EXECUTE stmt;
END $$;
