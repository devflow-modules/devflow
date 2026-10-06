-- ApplyFlow local rehearsal: inspect runtime vs migration role privileges.
-- Safe for local Docker only. Do not point at shared or production databases.
-- Never prints passwords. Run via: pnpm db:role:inspect

SELECT current_user AS session_user,
       current_database() AS database,
       inet_server_addr() AS server_addr,
       inet_server_port() AS server_port;

SELECT r.rolname,
       r.rolsuper,
       r.rolbypassrls,
       r.rolcanlogin,
       r.rolcreatedb,
       r.rolcreaterole
FROM pg_roles r
WHERE r.rolname IN (current_user, 'applyflow', 'applyflow_runtime', 'applyflow_migrator', 'anon', 'authenticated', 'service_role')
ORDER BY r.rolname;

SELECT n.nspname AS schema,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'applyflow_%'
ORDER BY c.relname;

SELECT c.relname AS table_name,
       COALESCE(json_agg(p.polname ORDER BY p.polname) FILTER (WHERE p.polname IS NOT NULL), '[]'::json) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'applyflow_profile_documents',
    'applyflow_contacts',
    'applyflow_contact_interactions',
    'applyflow_inbound_responses',
    'applyflow_career_events',
    'applyflow_personal_import_sessions',
    'applyflow_extension_grants'
  )
GROUP BY c.relname
ORDER BY c.relname;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name LIKE 'applyflow_%'
  AND grantee IN ('anon', 'authenticated', 'applyflow', 'applyflow_runtime', current_user)
ORDER BY table_name, grantee, privilege_type;
