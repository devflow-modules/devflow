-- Additive account-owned personal persistence.
-- Does not alter canonicalPersistence, pilotEligible, Jobs, or Applications.
-- Does not drop or rewrite existing rows.
--
-- Access path:
--   API isolation: requireApplyFlowAccount() derives accountId; repositories filter by it.
--   DB constraints: composite primary keys and FKs to applyflow_accounts.
--   RLS: enabled below WITHOUT FORCE. The table owner and any BYPASSRLS role
--   (typical Prisma/service connection) still bypass RLS. There is no permissive
--   policy for anon/authenticated, so PostgREST roles are denied by default.
--   Supabase Auth does not apply these policies to Prisma queries.
--   Applying this file is an operator step. Presence in the repo is not production proof.

-- CreateTable
CREATE TABLE "applyflow_profile_documents" (
    "account_id" UUID NOT NULL,
    "library" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applyflow_profile_documents_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "applyflow_contacts" (
    "account_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "application_id" TEXT,
    "job_id" TEXT,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applyflow_contacts_pkey" PRIMARY KEY ("account_id","id")
);

-- CreateTable
CREATE TABLE "applyflow_contact_interactions" (
    "account_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "application_id" TEXT,
    "job_id" TEXT,
    "payload" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applyflow_contact_interactions_pkey" PRIMARY KEY ("account_id","id")
);

-- CreateTable
CREATE TABLE "applyflow_inbound_responses" (
    "account_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email_id" TEXT NOT NULL,
    "application_id" TEXT,
    "state" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applyflow_inbound_responses_pkey" PRIMARY KEY ("account_id","id")
);

-- CreateTable
CREATE TABLE "applyflow_career_events" (
    "account_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "job_id" TEXT,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applyflow_career_events_pkey" PRIMARY KEY ("account_id","id")
);

-- CreateTable
CREATE TABLE "applyflow_personal_import_sessions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "bundle_fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expected_count" INTEGER NOT NULL,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "conflict_summary" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "applyflow_personal_import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applyflow_extension_grants" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applyflow_extension_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applyflow_contacts_account_id_application_id_idx" ON "applyflow_contacts"("account_id", "application_id");

-- CreateIndex
CREATE INDEX "applyflow_contacts_account_id_job_id_idx" ON "applyflow_contacts"("account_id", "job_id");

-- CreateIndex
CREATE INDEX "applyflow_contact_interactions_account_id_contact_id_idx" ON "applyflow_contact_interactions"("account_id", "contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "applyflow_inbound_responses_account_provider_email_key" ON "applyflow_inbound_responses"("account_id", "provider", "email_id");

-- CreateIndex
CREATE INDEX "applyflow_inbound_responses_account_id_application_id_idx" ON "applyflow_inbound_responses"("account_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "applyflow_career_events_account_dedupe_key" ON "applyflow_career_events"("account_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "applyflow_career_events_account_id_application_id_occurred_at_idx" ON "applyflow_career_events"("account_id", "application_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "applyflow_personal_import_account_module_fp_key" ON "applyflow_personal_import_sessions"("account_id", "module", "bundle_fingerprint");

-- CreateIndex
CREATE INDEX "applyflow_personal_import_sessions_account_id_status_idx" ON "applyflow_personal_import_sessions"("account_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "applyflow_extension_grants_token_hash_key" ON "applyflow_extension_grants"("token_hash");

-- CreateIndex
CREATE INDEX "applyflow_extension_grants_account_id_revoked_at_idx" ON "applyflow_extension_grants"("account_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "applyflow_profile_documents" ADD CONSTRAINT "applyflow_profile_documents_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applyflow_contacts" ADD CONSTRAINT "applyflow_contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applyflow_contact_interactions" ADD CONSTRAINT "applyflow_contact_interactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applyflow_inbound_responses" ADD CONSTRAINT "applyflow_inbound_responses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applyflow_career_events" ADD CONSTRAINT "applyflow_career_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applyflow_personal_import_sessions" ADD CONSTRAINT "applyflow_personal_import_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applyflow_extension_grants" ADD CONSTRAINT "applyflow_extension_grants_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: default deny for roles that do not own the table and do not bypass RLS.
-- No permissive policy is created. Prisma service connections are unaffected
-- unless the operator later sets FORCE ROW LEVEL SECURITY.
ALTER TABLE "applyflow_profile_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applyflow_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applyflow_contact_interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applyflow_inbound_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applyflow_career_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applyflow_personal_import_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applyflow_extension_grants" ENABLE ROW LEVEL SECURITY;

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
        'applyflow_extension_grants'
      ]
      LOOP
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;
