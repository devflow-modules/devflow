-- ApplyFlow local rehearsal ONLY (Docker 127.0.0.1:5434).
-- Contract A: API enforces account isolation. Runtime role is NOT superuser.
-- BYPASSRLS is intentional for Prisma under contract A (owner/FORCE not used).
-- Do not enable FORCE RLS. Do not grant anon/authenticated. Do not touch production.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'applyflow_runtime') THEN
    CREATE ROLE applyflow_runtime LOGIN PASSWORD 'applyflow_runtime_local_only'
      NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  ELSE
    ALTER ROLE applyflow_runtime LOGIN PASSWORD 'applyflow_runtime_local_only'
      NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM applyflow_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM applyflow_runtime;
GRANT USAGE ON SCHEMA public TO applyflow_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  applyflow_accounts,
  applyflow_jobs,
  applyflow_applications,
  applyflow_migration_sessions,
  applyflow_profile_documents,
  applyflow_contacts,
  applyflow_contact_interactions,
  applyflow_inbound_responses,
  applyflow_career_events,
  applyflow_personal_import_sessions,
  applyflow_extension_grants
TO applyflow_runtime;

-- Keep anon/authenticated denied (migration already revokes when those roles exist).
DO $$
DECLARE
  role_name text;
  table_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY ARRAY[
        'applyflow_profile_documents',
        'applyflow_contacts',
        'applyflow_contact_interactions',
        'applyflow_inbound_responses',
        'applyflow_career_events',
        'applyflow_personal_import_sessions',
        'applyflow_extension_grants',
        'applyflow_jobs',
        'applyflow_applications',
        'applyflow_accounts'
      ]
      LOOP
        IF EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = table_name
        ) THEN
          EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, role_name);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;

SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolcanlogin
FROM pg_roles r
WHERE r.rolname IN ('applyflow', 'applyflow_runtime')
ORDER BY r.rolname;
